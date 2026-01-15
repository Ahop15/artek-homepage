"""
 █████╗ ██████╗  █████╗ ███████╗
██╔══██╗██╔══██╗██╔══██╗██╔════╝
███████║██████╔╝███████║███████╗
██╔══██║██╔══██╗██╔══██║╚════██║
██║  ██║██║  ██║██║  ██║███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

Translation helper for multilingual Streamlit dashboard

Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
"""

import json
import streamlit as st
from typing import Dict, Any
from pathlib import Path


def load_translations(locale: str) -> Dict[str, Any]:
    """
    Load translation file for given locale

    Args:
        locale: Language code ('tr' or 'en')

    Returns:
        Dictionary of translations
    """
    locale_file = Path(__file__).parent / 'locales' / f'{locale}.json'

    try:
        with open(locale_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Translation file not found: {locale_file}")
        return {}


def get_locale() -> str:
    """
    Get current locale from session state

    Returns:
        Current locale ('tr' or 'en')
    """
    if 'locale' not in st.session_state:
        st.session_state.locale = 'tr'  # Default Turkish
    return st.session_state.locale


def set_locale(locale: str):
    """
    Set locale in session state

    Args:
        locale: Language code ('tr' or 'en')
    """
    st.session_state.locale = locale


def t(key: str) -> str:
    """
    Get translated string by dot notation key

    Args:
        key: Translation key in dot notation (e.g., 'app.title')

    Returns:
        Translated string or key if not found

    Example:
        >>> t('sessions.title')
        'Konuşma Oturumları'  # if locale is 'tr'
    """
    locale = get_locale()
    translations = load_translations(locale)

    # Navigate nested dict with dot notation
    keys = key.split('.')
    value = translations

    for k in keys:
        if isinstance(value, dict):
            value = value.get(k, key)
        else:
            return key

    return value if isinstance(value, str) else key