# Scrollable List Tables

A small WordPress plugin for testing readable desktop admin columns with horizontal scrolling.

Legacy admin tables can squeeze titles into very narrow columns when plugins add more fields. This prototype keeps the existing tables and plugin columns, gives Core text columns minimum widths, and lets the table scroll when it no longer fits.

## Install

1. Download **scrollable-list-tables-0.1.0.zip** from the [0.1.0 release](https://github.com/mattmiklic/scrollable-list-tables/releases/tag/v0.1.0).
2. In WordPress, go to **Plugins → Add Plugin → Upload Plugin**.
3. Upload the ZIP, install it, and activate **Scrollable List Tables**.

There are no settings. Deactivate the plugin and reload the page to compare the original layout. No Core patch or database migration is needed.

## What changes

- Above 782 CSS pixels, Core text columns have minimum widths and the table scrolls horizontally when needed.
- The outer border stays around the scrolling viewport. Filters, bulk actions, and pagination stay outside it.
- The table region supports keyboard scrolling with the arrow keys.
- WordPress keeps its existing mobile layout and expandable row details at 782 pixels and below.

The plugin targets Core list screens, including Posts and custom post types, Pages, Media list view, Comments, Users, Categories and Tags, Installed Plugins, and corresponding network tables. Custom plugin administration pages are outside this initial scope.

It has no tracking, external requests, settings, or database writes. Public pages are unaffected. A small admin script adds the wrapper without replacing the table or its event handlers, and handles tables replaced by AJAX. CSS handles the layout.

This is an early testing prototype, not an official WordPress release. It does not add truncation, sticky columns, or DataViews. Long plugin descriptions can still create tall rows.

## Try it and report issues

Use a local or staging site with a mixture of short and long titles. For extra columns, install Yoast SEO and enable its SEO Title, Meta Desc., Keyphrase, score, and link-count columns in Screen Options. Yoast is optional and is not bundled.

Try resizing, scrolling, keyboard navigation, sorting, pagination, Screen Options, Quick Edit, Bulk Edit, and Installed Plugins live search. Check the other list screens you use too.

[Report an issue](https://github.com/mattmiklic/scrollable-list-tables/issues) with the WordPress version, browser, admin screen, plugins that add columns, approximate viewport width, and a screenshot when useful.

## Development

Tests require Node.js 18 or newer. Building the ZIP requires Python 3. The plugin requires WordPress 6.0 or newer and PHP 7.4 or newer.

```sh
npm ci
npm test
php -l scrollable-list-tables.php
node --check assets/list-tables.js
npm run build
```

The build writes `dist/scrollable-list-tables-0.1.0.zip`. Only the main PHP file, two assets, WordPress readme, and license enter the ZIP. Development dependencies and tests are not bundled.

The plugin reuses an existing `wp-list-table-scroll` wrapper when running alongside the Core prototype. Deactivating it does not undo a separate Core patch.

## Validation

Version 0.1.0 was installed from its ZIP on unmodified WordPress 7.1.2 with PHP 8.4 and Yoast SEO 28.5. Chromium checks covered desktop widths, unchanged mobile measurements, Quick Edit saving, keyboard scrolling, Plugins live-search replacement, public-page asset isolation, and deactivation restoring the original layout.

The DOM regression tests cover preservation of table nodes and event handlers, navigation placement, existing wrappers, nested tables, and AJAX table replacement. Broader browser, assistive-technology, multisite, and third-party compatibility testing remains part of the prototype.

## License

[GNU General Public License v2.0 or later](LICENSE).
