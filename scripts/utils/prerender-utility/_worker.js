// Injected from config.yaml during build
// noinspection JSUnresolvedVariable
const LOCALES = __LOCALES__;
// noinspection JSUnresolvedVariable
const DEFAULT_LOCALE = __DEFAULT_LOCALE__;
// noinspection JSUnresolvedVariable
const THEMES = __THEMES__;
// noinspection JSUnresolvedVariable
const DEFAULT_THEME = __DEFAULT_THEME__;

// noinspection JSUnusedGlobalSymbols
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Static assets
    if (pathname.includes('.') && !pathname.endsWith('.html')) {
      return env.ASSETS.fetch(request);
    }

    // Determine locale
    let locale = DEFAULT_LOCALE;

    // Get cookies
    const cookie = request.headers.get('cookie') || '';

    // Priority 1: Cookie
    const cookieLocale = cookie.match(/preferred_locale=(\w+)/)?.[1];

    if (cookieLocale && LOCALES.includes(cookieLocale)) {
      locale = cookieLocale;
    } else {
      // Priority 2: Accept-Language (primary language only)
      const acceptLang = request.headers.get('accept-language') || '';
      const primaryLang = acceptLang.split(',')[0]?.trim().toLowerCase().split('-')[0];

      if (primaryLang && LOCALES.includes(primaryLang)) {
        locale = primaryLang;
      }
    }

    // Determine theme
    let theme = DEFAULT_THEME;

    // Cookie: preferred_theme
    const cookieTheme = cookie.match(/preferred_theme=(white|g90)/)?.[1];

    if (cookieTheme && THEMES.includes(cookieTheme)) {
      theme = cookieTheme;
    }

    // Build file paths with fallback chain
    const basePath = pathname === '/' ? '/index' : `${pathname.replace(/\/$/, '')}/index`;
    const themeSuffix = theme === DEFAULT_THEME ? '' : `.${theme}`;
    const localeSuffix = locale === DEFAULT_LOCALE ? '' : `.${locale}`;

    const tryPaths = [
      `${basePath}${themeSuffix}${localeSuffix}.html`,  // Full match: index.g90.en.html
      `${basePath}${localeSuffix}.html`,                 // Theme fallback: index.en.html
      `${basePath}${themeSuffix}.html`,                  // Locale fallback: index.g90.html
      `${basePath}.html`                                 // Full fallback: index.html
    ];

    // Serve file
    for (const tryPath of tryPaths) {
      try {
        const response = await env.ASSETS.fetch(new URL(tryPath, url.origin));

        if (response.status === 200) {
          // Set response headers
          const headers = new Headers(response.headers);
          headers.set('Content-Language', locale);
          headers.set('Vary', 'Accept-Language, Cookie');

          // Return prerendered HTML as-is (already contains data-carbon-theme)
          return new Response(response.body, {
            status: response.status,
            headers
          });
        }
      } catch (e) {
        // Try next path
      }
    }

    return env.ASSETS.fetch(request);
  }
};