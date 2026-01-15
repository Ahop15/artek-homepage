"""
 █████╗ ██████╗  █████╗ ███████╗
██╔══██╗██╔══██╗██╔══██╗██╔════╝
███████║██████╔╝███████║███████╗
██╔══██║██╔══██╗██╔══██║╚════██║
██║  ██║██║  ██║██║  ██║███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

Local SQLite Database Connector (Development)

TR:
----
Wrangler dev tarafından oluşturulan local SQLite veritabanına bağlanır.
Production'daki Cloudflare D1 API yerine doğrudan SQLite kullanır.

EN:
----
Connects to local SQLite database created by wrangler dev.
Uses direct SQLite instead of Cloudflare D1 API in production.

Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
"""

import json
import glob
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path

# Istanbul timezone (UTC+3)
TZ_ISTANBUL = ZoneInfo("Europe/Istanbul")


def format_timestamp(ts_ms: int) -> str:
    """
    Convert Unix timestamp (ms) to Istanbul timezone string

    Args:
        ts_ms: Unix timestamp in milliseconds

    Returns:
        Formatted datetime string in Europe/Istanbul timezone
    """
    dt_utc = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    dt_local = dt_utc.astimezone(TZ_ISTANBUL)
    return dt_local.strftime('%Y-%m-%d %H:%M:%S')


def get_sqlite_path() -> str:
    """
    TR:
    ----
    Wrangler'ın oluşturduğu SQLite dosyasını bulur.
    .wrangler/state/v3/d1/miniflare-D1DatabaseObject/ altında arar.

    EN:
    ----
    Finds the SQLite file created by wrangler.
    Searches under .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
    """
    # Get the ai-worker directory (relative to this script)
    script_dir = Path(__file__).parent
    ai_worker_dir = script_dir.parent.parent.parent / 'workers' / 'ai-worker'

    # Find SQLite files
    pattern = str(ai_worker_dir / '.wrangler' / 'state' / 'v3' / 'd1' / 'miniflare-D1DatabaseObject' / '*.sqlite')
    sqlite_files = glob.glob(pattern)

    if not sqlite_files:
        raise FileNotFoundError(f"No SQLite file found. Run 'wrangler dev' first to create the database.\nSearched: {pattern}")

    # Return the first (and usually only) SQLite file
    return sqlite_files[0]


def get_connection() -> sqlite3.Connection:
    """
    TR: SQLite bağlantısı oluştur
    EN: Create SQLite connection
    """
    db_path = get_sqlite_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Dict-like access
    return conn


def get_database_info() -> Dict[str, Any]:
    """
    TR: Veritabanı bilgilerini döndür
    EN: Return database information
    """
    try:
        db_path = get_sqlite_path()
        return {
            'name': 'Local SQLite (dev)',
            'uuid': 'local-dev',
            'path': db_path
        }
    except FileNotFoundError:
        return {
            'name': 'Not Found',
            'uuid': 'local-dev',
            'path': None
        }


def query_sqlite(sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
    """
    TR: SQLite sorgusu çalıştır
    EN: Execute SQLite query

    Args:
        sql: SQL query string
        params: Optional list of parameters

    Returns:
        List of result rows as dictionaries
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)

        rows = cursor.fetchall()
        conn.close()

        # Convert Row objects to dictionaries
        return [dict(row) for row in rows]

    except Exception as e:
        print(f"SQLite Query Error: {e}")
        return []


def get_total_tokens() -> Dict[str, int]:
    """
    TR: Tüm konuşmalardaki toplam token sayılarını getir
    EN: Get total token counts across all conversations

    Returns:
        Dictionary with total_input_tokens and total_output_tokens
    """
    sql = """
    SELECT
        COALESCE(SUM(tokens_in), 0) as total_input_tokens,
        COALESCE(SUM(tokens_out), 0) as total_output_tokens
    FROM conversation_logs
    """

    results = query_sqlite(sql)

    if results and len(results) > 0:
        return {
            'total_input_tokens': results[0].get('total_input_tokens', 0),
            'total_output_tokens': results[0].get('total_output_tokens', 0)
        }

    return {'total_input_tokens': 0, 'total_output_tokens': 0}


def get_ip_hashes() -> List[Dict[str, Any]]:
    """
    TR: Benzersiz IP hash'lerini oturum sayılarıyla birlikte getir
    EN: Get list of unique IP hashes with session counts
    """
    sql = """
    SELECT
        ip_hash,
        COUNT(DISTINCT chain_id) as session_count,
        COUNT(*) as total_blocks,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
    FROM conversation_logs
    WHERE ip_hash IS NOT NULL
    GROUP BY ip_hash
    ORDER BY last_seen DESC
    """

    results = query_sqlite(sql)

    # Convert timestamps to Istanbul timezone
    for row in results:
        if row['first_seen']:
            row['first_seen'] = format_timestamp(row['first_seen'])
        if row['last_seen']:
            row['last_seen'] = format_timestamp(row['last_seen'])

    return results


def get_sessions(ip_hash: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    TR: Konuşma oturumlarını toplu metriklerle birlikte getir
    EN: Get list of conversation sessions with aggregated metrics

    Args:
        ip_hash: Optional IP hash to filter sessions
        limit: Maximum number of sessions to return

    Returns:
        List of sessions with chain_id, timestamps, token counts
    """
    sql = """
    SELECT
        chain_id,
        MIN(created_at) as started_at,
        MAX(created_at) as ended_at,
        COUNT(*) as block_count,
        SUM(tokens_in) as total_input_tokens,
        SUM(tokens_out) as total_output_tokens,
        ip_hash
    FROM conversation_logs
    """

    params = []

    # Optional IP hash filtering
    if ip_hash:
        sql += " WHERE ip_hash = ?"
        params.append(ip_hash)

    sql += """
    GROUP BY chain_id
    ORDER BY started_at DESC
    LIMIT ?
    """

    params.append(limit)

    results = query_sqlite(sql, params)

    # Convert timestamps to Istanbul timezone
    for row in results:
        if row['started_at']:
            row['started_at'] = format_timestamp(row['started_at'])
        if row['ended_at']:
            row['ended_at'] = format_timestamp(row['ended_at'])

    return results


def get_chain_blocks(chain_id: str) -> List[Dict[str, Any]]:
    """
    TR: Konuşma zincirindeki tüm blokları getir (blockchain timeline)
    EN: Get all blocks in a conversation chain (blockchain timeline)

    Args:
        chain_id: The blockchain chain ID

    Returns:
        List of blocks in chronological order
    """
    sql = """
    SELECT
        block_index,
        block_hash,
        prev_hash,
        context_hash,
        user_message,
        assistant_response,
        tool_calls,
        tokens_in,
        tokens_out,
        model,
        latency_ms,
        created_at
    FROM conversation_logs
    WHERE chain_id = ?
    ORDER BY block_index
    """

    results = query_sqlite(sql, [chain_id])

    # Parse JSON fields and convert timestamps to Istanbul timezone
    for row in results:
        row['tool_calls'] = json.loads(row['tool_calls']) if row['tool_calls'] else []
        if row['created_at']:
            row['created_at'] = format_timestamp(row['created_at'])

    return results


def get_all_sessions_for_bulk_export() -> List[Dict[str, Any]]:
    """
    Get all sessions grouped by IP hash for bulk export

    Returns:
        List of sessions with chain_id, ip_hash, timestamps, token counts
    """
    sql = """
    SELECT
        chain_id,
        ip_hash,
        MIN(created_at) as started_at,
        MAX(created_at) as ended_at,
        COUNT(*) as block_count,
        SUM(tokens_in) as total_input_tokens,
        SUM(tokens_out) as total_output_tokens
    FROM conversation_logs
    GROUP BY chain_id
    ORDER BY ip_hash, started_at DESC
    """

    results = query_sqlite(sql)

    # Convert timestamps to Istanbul timezone
    for row in results:
        if row['started_at']:
            row['started_at'] = format_timestamp(row['started_at'])
        if row['ended_at']:
            row['ended_at'] = format_timestamp(row['ended_at'])

    return results


def get_bulk_export_stats() -> Dict[str, Any]:
    """
    Get statistics for bulk export preview

    Returns:
        Dictionary with total_ips, total_sessions, total_blocks, estimated_size
    """
    sql = """
    SELECT
        COUNT(DISTINCT ip_hash) as total_ips,
        COUNT(DISTINCT chain_id) as total_sessions,
        COUNT(*) as total_blocks,
        SUM(LENGTH(user_message) + LENGTH(assistant_response)) as total_chars
    FROM conversation_logs
    """

    results = query_sqlite(sql)

    if results and len(results) > 0:
        total_chars = results[0].get('total_chars', 0) or 0
        # Rough estimate: chars + overhead for markdown formatting
        estimated_bytes = total_chars * 1.2
        return {
            'total_ips': results[0].get('total_ips', 0),
            'total_sessions': results[0].get('total_sessions', 0),
            'total_blocks': results[0].get('total_blocks', 0),
            'estimated_size': estimated_bytes
        }

    return {'total_ips': 0, 'total_sessions': 0, 'total_blocks': 0, 'estimated_size': 0}