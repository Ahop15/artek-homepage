"""
 █████╗ ██████╗  █████╗ ███████╗
██╔══██╗██╔══██╗██╔══██╗██╔════╝
███████║██████╔╝███████║███████╗
██╔══██║██╔══██╗██╔══██║╚════██║
██║  ██║██║  ██║██║  ██║███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

Cloudflare D1 Database Connector

Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
"""

import os
import json
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import requests

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


from dotenv import load_dotenv

# Load environment variables
load_dotenv()

CLOUDFLARE_API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN')
CLOUDFLARE_ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID')
D1_DATABASE_ID = os.getenv('D1_DATABASE_ID')

# Cloudflare D1 API endpoints
D1_API_URL = f'https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{D1_DATABASE_ID}/query'
D1_INFO_URL = f'https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{D1_DATABASE_ID}'


def get_database_info() -> Dict[str, Any]:
    """
    Get D1 database information from Cloudflare API

    Returns:
        Dictionary with database name, uuid, version, etc.
    """
    if not CLOUDFLARE_API_TOKEN or not CLOUDFLARE_ACCOUNT_ID:
        return {'name': 'unknown', 'uuid': D1_DATABASE_ID}

    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.get(D1_INFO_URL, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()

        if data.get('success') and data.get('result'):
            return data['result']

        return {'name': 'unknown', 'uuid': D1_DATABASE_ID}

    except requests.exceptions.RequestException as e:
        print(f"D1 Info Error: {e}")
        return {'name': 'unknown', 'uuid': D1_DATABASE_ID}


def query_d1(sql: str, params: Optional[List[Any]] = None, max_retries: int = 3) -> List[Dict[str, Any]]:
    """
    Execute SQL query on Cloudflare D1 database with retry logic

    Args:
        sql: SQL query string
        params: Optional list of parameters for prepared statement
        max_retries: Maximum number of retry attempts (default: 3)

    Returns:
        List of result rows as dictionaries
    """
    if not CLOUDFLARE_API_TOKEN or not CLOUDFLARE_ACCOUNT_ID:
        raise ValueError('Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID in .env')

    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/json'
    }

    payload: Dict[str, Any] = {'sql': sql}

    if params:
        payload['params'] = params

    # Retry with exponential backoff
    for attempt in range(max_retries):
        try:
            response = requests.post(D1_API_URL, json=payload, headers=headers, timeout=15)
            response.raise_for_status()

            data = response.json()

            # Cloudflare API response format
            if data.get('success') and data.get('result') and len(data['result']) > 0:
                return data['result'][0].get('results', [])

            return []

        except requests.exceptions.RequestException as e:
            is_last_attempt = attempt == max_retries - 1

            # Check if it's a retryable error (503, 429, connection errors)
            should_retry = (
                isinstance(e, (requests.exceptions.ConnectionError, requests.exceptions.Timeout)) or
                (hasattr(e, 'response') and e.response is not None and e.response.status_code in [503, 429, 502, 504])
            )

            if should_retry and not is_last_attempt:
                wait_time = (2 ** attempt) * 0.5  # 0.5s, 1s, 2s
                print(f"D1 Query Error (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"D1 Query Error: {e}")
                return []

    return []


def get_total_tokens() -> Dict[str, int]:
    """
    Get total token counts across all conversations

    Returns:
        Dictionary with total_input_tokens and total_output_tokens
    """
    sql = """
    SELECT
        COALESCE(SUM(tokens_in), 0) as total_input_tokens,
        COALESCE(SUM(tokens_out), 0) as total_output_tokens
    FROM conversation_logs
    """

    results = query_d1(sql)

    if results and len(results) > 0:
        return {
            'total_input_tokens': results[0].get('total_input_tokens', 0),
            'total_output_tokens': results[0].get('total_output_tokens', 0)
        }

    return {'total_input_tokens': 0, 'total_output_tokens': 0}


def get_ip_hashes() -> List[Dict[str, Any]]:
    """
    Get list of unique IP hashes with session counts

    Returns:
        List of IP hashes with statistics
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

    results = query_d1(sql)

    # Convert timestamps to Istanbul timezone
    for row in results:
        row['first_seen'] = format_timestamp(row['first_seen'])
        row['last_seen'] = format_timestamp(row['last_seen'])

    return results


# noinspection SqlDialectInspection
def get_sessions(ip_hash: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Get list of conversation sessions with aggregated metrics

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

    results = query_d1(sql, params)

    # Convert timestamps to Istanbul timezone
    for row in results:
        row['started_at'] = format_timestamp(row['started_at'])
        row['ended_at'] = format_timestamp(row['ended_at'])

    return results


def get_chain_blocks(chain_id: str) -> List[Dict[str, Any]]:
    """
    Get all blocks in a conversation chain (blockchain timeline)

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

    results = query_d1(sql, [chain_id])

    # Parse JSON fields and convert timestamps to Istanbul timezone
    for row in results:
        row['tool_calls'] = json.loads(row['tool_calls']) if row['tool_calls'] else []
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

    results = query_d1(sql)

    # Convert timestamps to Istanbul timezone
    for row in results:
        row['started_at'] = format_timestamp(row['started_at'])
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

    results = query_d1(sql)

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