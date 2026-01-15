"""
 █████╗ ██████╗  █████╗ ███████╗
██╔══██╗██╔══██╗██╔══██╗██╔════╝
███████║██████╔╝███████║███████╗
██╔══██║██╔══██╗██╔══██║╚════██║
██║  ██║██║  ██║██║  ██║███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

ARTEK AI Worker Dashboard

Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
"""

import os
import streamlit as st

# Environment-based database connector selection
# Set ENVIRONMENT=dev in .env for local SQLite, defaults to prod (Cloudflare D1)
if os.getenv('ENVIRONMENT', 'prod') == 'dev':
    from db_connector_dev import (
        get_sessions, get_chain_blocks, get_database_info,
        get_ip_hashes, get_total_tokens,
        get_all_sessions_for_bulk_export, get_bulk_export_stats
    )
else:
    from db_connector import (
        get_sessions, get_chain_blocks, get_database_info,
        get_ip_hashes, get_total_tokens,
        get_all_sessions_for_bulk_export, get_bulk_export_stats
    )

from translations import get_locale, set_locale, t
from export_utils import (
    export_session_markdown,
    export_session_json,
    get_export_filename,
    create_bulk_export_zip,
    get_bulk_export_filename,
    format_file_size
)

# Page config - no sidebar
st.set_page_config(
    page_title=t('app.title'),
    page_icon=t('app.pageIcon'),
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Hide sidebar completely with CSS
st.markdown("""
<style>
    [data-testid="stSidebar"] { display: none; }
    [data-testid="stSidebarNav"] { display: none; }
    .thinking-block {
        background-color: rgba(128, 128, 128, 0.1);
        border-left: 3px solid #888;
        padding: 10px;
        margin: 5px 0;
        font-style: italic;
        opacity: 0.7;
    }

    [data-theme="dark"] .modal-container {
        background: #0e1117;
    }
</style>
""", unsafe_allow_html=True)

# ========================================
# BULK EXPORT MODAL
# ========================================
@st.dialog(t('bulkExport.title'), width="large")
def bulk_export_modal():
    """Modal dialog for bulk database export"""
    st.markdown(t('bulkExport.description'))

    # Get bulk export stats
    bulk_stats = get_bulk_export_stats()

    if bulk_stats['total_sessions'] > 0:
        # Display stats
        stats_col1, stats_col2, stats_col3, stats_col4 = st.columns(4)
        with stats_col1:
            st.metric(t('bulkExport.totalIPs'), bulk_stats['total_ips'])
        with stats_col2:
            st.metric(t('bulkExport.totalSessions'), bulk_stats['total_sessions'])
        with stats_col3:
            st.metric(t('bulkExport.totalBlocks'), bulk_stats['total_blocks'])
        with stats_col4:
            st.metric(t('bulkExport.estimatedSize'), format_file_size(bulk_stats['estimated_size']))

        st.warning(t('bulkExport.warning'))

        # Export button
        if st.button(t('bulkExport.startExport'), type="primary", use_container_width=True):
            # Create expandable status container
            with st.status(t('bulkExport.progress.exporting'), expanded=True) as status:
                # Load all sessions
                st.write(f"📊 {t('bulkExport.progress.overall')}")
                all_sessions = get_all_sessions_for_bulk_export()

                progress_bar = st.progress(0)
                progress_text = st.empty()

                # Progress callback
                def update_progress(current, total, message):
                    progress = current / total
                    progress_bar.progress(progress)
                    progress_text.text(f"{current}/{total} - {message}")

                # Create ZIP
                try:
                    zip_data = create_bulk_export_zip(
                        all_sessions,
                        get_chain_blocks,
                        locale=get_locale(),
                        progress_callback=update_progress
                    )

                    # Update status to complete
                    status.update(label=t('bulkExport.success'), state="complete", expanded=True)

                    # Download button
                    st.download_button(
                        label=t('bulkExport.download'),
                        data=zip_data,
                        file_name=get_bulk_export_filename(),
                        mime="application/zip",
                        type="primary",
                        use_container_width=True
                    )

                except Exception as e:
                    status.update(label=t('bulkExport.error'), state="error", expanded=True)
                    st.error(f"Error: {str(e)}")
    else:
        st.info(t('sessions.noData'))


# ========================================
# HEADER WITH LANGUAGE SELECTOR
# ========================================
db_info = get_database_info()
total_tokens = get_total_tokens()
is_production = os.getenv('ENVIRONMENT', 'prod') == 'prod'

# Header columns (with bulk export and logout in production)
if is_production:
    header_col1, header_col2, header_col3, header_col4, header_col5, header_col6 = st.columns([2, 1, 1, 1, 1, 1])
else:
    header_col1, header_col2, header_col3, header_col4, header_col5 = st.columns([2, 1, 1, 1, 1])
    header_col6 = None  # Explicit None for linter

with header_col1:
    st.title(t('app.title'))
    st.caption(f"📦 {t('sidebar.database')}: `{db_info.get('name', 'unknown')}`")
    st.caption(f"📊 {t('metrics.totalInputTokens')}: `{total_tokens['total_input_tokens']:,}` | {t('metrics.totalOutputTokens')}: `{total_tokens['total_output_tokens']:,}`")

with header_col2:
    if st.button(t('language.turkish'), use_container_width=True, type="primary" if get_locale() == 'tr' else "secondary"):
        set_locale('tr')
        st.rerun()

with header_col3:
    if st.button(t('language.english'), use_container_width=True, type="primary" if get_locale() == 'en' else "secondary"):
        set_locale('en')
        st.rerun()

with header_col4:
    if st.button(f"🔄 {t('actions.refresh')}", use_container_width=True, type="secondary"):
        st.rerun()

with header_col5:
    if st.button(f"📦 {t('bulkExport.exportAll')}", use_container_width=True, type="secondary"):
        bulk_export_modal()

# Logout button (production only)
if header_col6 is not None:
    with header_col6:
        if st.button(f"🚪 {t('actions.logout')}", use_container_width=True, type="secondary", key="logout_btn"):
            st.markdown(
                '<meta http-equiv="refresh" content="0; url=/logout">',
                unsafe_allow_html=True
            )


st.markdown("---")

# ========================================
# IP HASH FILTER (Optional)
# ========================================
ip_hashes = get_ip_hashes()

if ip_hashes and len(ip_hashes) > 0:
    st.subheader(t('ipFilter.title'))

    # Create filter options
    filter_options = [t('ipFilter.allSessions')] + [
        f"{t('ipFilter.ipPrefix')} {ip['ip_hash'][:12]}... ({ip['session_count']} {t('ipFilter.sessionsCount')}, {ip['total_blocks']} {t('ipFilter.blocksCount')})"
        for ip in ip_hashes
    ]

    selected_filter = st.selectbox(
        t('ipFilter.selectLabel'),
        range(len(filter_options)),
        format_func=lambda _i: filter_options[_i]
    )

    # Get selected IP hash (None for "All")
    selected_ip_hash = None if selected_filter == 0 else ip_hashes[selected_filter - 1]['ip_hash']

    st.markdown("---")
else:
    selected_ip_hash = None

# ========================================
# MAIN CONTENT
# ========================================

# Load sessions (with optional IP filter)
sessions = get_sessions(ip_hash=selected_ip_hash, limit=100)

if not sessions:
    st.warning(t('sessions.noData'))
else:
    # Session selector
    session_options = [
        f"{s['chain_id'][:8]}... | {s['block_count']} blocks | {s['started_at']}"
        for s in sessions
    ]

    selected_index = st.selectbox(
        t('sessions.select'),
        range(len(session_options)),
        format_func=lambda _i: session_options[_i]
    )

    selected_session = sessions[selected_index]
    chain_id = selected_session['chain_id']

    # Session summary metrics
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric(t('metrics.messages'), selected_session['block_count'])
    with col2:
        st.metric(t('metrics.inputTokens'), f"{selected_session['total_input_tokens']:,}")
    with col3:
        st.metric(t('metrics.outputTokens'), f"{selected_session['total_output_tokens']:,}")

    st.markdown("---")

    # ========================================
    # EXPORT SECTION
    # ========================================
    st.subheader(t('export.title'))

    # Load blocks for export (reuse later for display)
    export_blocks = get_chain_blocks(chain_id)

    if export_blocks:
        export_col1, export_col2, export_col3 = st.columns([1, 1, 2])

        with export_col1:
            # Markdown export
            md_content = export_session_markdown(selected_session, export_blocks, locale=get_locale())
            md_filename = get_export_filename(selected_session, 'md')
            st.download_button(
                label=t('export.markdown'),
                data=md_content,
                file_name=md_filename,
                mime="text/markdown",
                help=t('export.markdownTooltip'),
                use_container_width=True
            )

        with export_col2:
            # JSON export
            json_content = export_session_json(selected_session, export_blocks, include_hashes=True)
            json_filename = get_export_filename(selected_session, 'json')
            st.download_button(
                label=t('export.json'),
                data=json_content,
                file_name=json_filename,
                mime="application/json",
                help=t('export.jsonTooltip'),
                use_container_width=True
            )

    st.markdown("---")

    # Chain Integrity Check
    st.subheader(t('blockchain.integrityCheck'))
    if st.button(t('blockchain.validateButton')):
        with st.spinner(t('blockchain.validating')):
            blocks_for_validation = get_chain_blocks(chain_id)

            is_valid = True
            for i, block in enumerate(blocks_for_validation):
                if i == 0 and block['prev_hash'] is not None:
                    is_valid = False
                    st.error(f"{t('blockchain.chainInvalid')} - Genesis block has prev_hash!")
                    break

                if i > 0 and block['prev_hash'] != blocks_for_validation[i-1]['block_hash']:
                    is_valid = False
                    st.error(f"{t('blockchain.chainInvalid')} - Chain broken at block {i}!")
                    break

            if is_valid:
                st.success(f"{t('blockchain.chainValid')} ({len(blocks_for_validation)} {t('sessions.blocks')})")

    st.markdown("---")

    # Reuse blocks loaded for export (avoid duplicate API call)
    blocks = export_blocks

    if not blocks:
        st.error(t('sessions.noData'))
    else:
        st.subheader(f"{t('sessions.timeline')} ({len(blocks)} {t('sessions.blocks')})")

        # Display as chat interface
        for block in blocks:
            # User message
            with st.chat_message("user"):
                st.markdown(block['user_message'])
                st.caption(f"{t('metrics.timestamp')} {block['created_at']}")

            # Tool calls (thinking mode - if any)
            if block['tool_calls'] and len(block['tool_calls']) > 0:
                for tool_call in block['tool_calls']:
                    with st.chat_message("assistant", avatar="🔧"):
                        st.markdown(f"**{t('tools.knowledgeSearch')}**")

                        # Tool query
                        query = tool_call.get('input', {})
                        if isinstance(query, dict):
                            query_text = query.get('query', str(query))
                        else:
                            query_text = str(query)
                        st.markdown(f"**{t('tools.inputQuery')}:** `{query_text}`")

                        # Tool output - full content in expander
                        with st.expander(t('tools.outputFull'), expanded=False):
                            output = tool_call.get('output', '')
                            st.text(output)

            # Assistant response
            with st.chat_message("assistant"):
                st.markdown(block['assistant_response'])

                # Metadata in expander
                with st.expander(t('metrics.blockMetadata'), expanded=False):
                    metadata_col1, metadata_col2, metadata_col3 = st.columns(3)

                    with metadata_col1:
                        st.markdown(f"""
                        **{t('metrics.tokens')}**
                        - {t('metrics.input')}: `{block['tokens_in']:,}`
                        - {t('metrics.output')}: `{block['tokens_out']:,}`
                        """)

                    with metadata_col2:
                        st.markdown(f"""
                        **{t('metrics.performance')}**
                        - {t('metrics.latency')}: `{block['latency_ms']}ms`
                        - {t('metrics.model')}: `{block['model']}`
                        """)

                    with metadata_col3:
                        st.markdown(f"""
                        **{t('metrics.blockchain')}**
                        - {t('metrics.blockIndex')}: `{block['block_index']}`
                        - {t('metrics.blockHash')}: `{block['block_hash'][:16]}...`
                        - {t('metrics.prevHash')}: `{block['prev_hash'][:16] if block['prev_hash'] else t('metrics.genesis')}...`
                        - {t('metrics.contextHash')}: `{block['context_hash'][:16]}...`
                        """)