/*
 * Default browser runtime config for non-Docker development.
 * The Docker image overwrites this file at container startup so
 * frontend environment changes do not require rebuilding the bundle.
 */
window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};
