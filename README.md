# Scrollable List Tables

A small WordPress plugin for testing readable desktop admin columns with horizontal scrolling.

Legacy admin tables can squeeze titles into very narrow columns when plugins add more fields. This prototype keeps the existing tables and plugin columns, gives Core text columns minimum widths, and lets the table scroll when it no longer fits.

## Install

1. Download **scrollable-list-tables-0.1.7.zip** from the [0.1.7 release](https://github.com/mattmiklic/scrollable-list-tables/releases/tag/v0.1.7).
2. In WordPress, go to **Plugins → Add Plugin → Upload Plugin**.
3. Upload the ZIP, install it, and activate **Scrollable List Tables**.

There are no settings. Deactivate the plugin and reload the page to compare the original layout. No Core patch or database migration is needed.

## What changes

- Above 782 CSS pixels, Core text columns have minimum widths and the table scrolls horizontally when needed.
- The outer border stays around the scrolling viewport. Filters, bulk actions, and pagination stay outside it.
- A 32-pixel fade to white indicates hidden columns at either edge. Each fade disappears when that edge is reached, including in right-to-left layouts. The fades do not intercept clicks or add keyboard stops.
- Desktop tables suppress horizontal rubber-band overscroll where supported.
- The table region supports keyboard scrolling with the arrow keys.
- WordPress keeps its existing mobile layout and expandable row details at 782 pixels and below.

Native JavaScript scroll and resize handling controls fade visibility. CSS handles their appearance. Browsers without `ResizeObserver` retain horizontal scrolling without the fades. Overscroll containment also prevents browser back/forward gestures where supported; Safari may still allow navigation gestures.

The plugin targets Core list screens, including Posts and custom post types, Pages, Media list view, Comments, Users, Categories and Tags, Installed Plugins, and corresponding network tables. Custom plugin administration pages are outside this initial scope.

It has no tracking, external requests, settings, or database writes. Public pages are unaffected. A small admin script adds the wrapper without replacing the table or its event handlers, tracks scrolling and resizing, and handles tables replaced by AJAX. CSS handles the layout.

This is an early testing prototype, not an official WordPress release. It does not add truncation, sticky columns, or DataViews. Long plugin descriptions can still create tall rows. Content that deliberately prevents wrapping, such as formatted code or a fixed-width widget, can widen a column across every row and cause the whole table to scroll. No maximum column width is imposed.

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

The build writes `dist/scrollable-list-tables-0.1.7.zip`. Only the main PHP file, two assets, WordPress readme, and license enter the ZIP. Development dependencies and tests are not bundled.

When running alongside the current Core prototype, the plugin leaves existing `wp-list-table-scroll` wrappers and their overflow tracking to Core. Deactivating it does not undo a separate Core patch.

## Validation

Version 0.1.7 restores passive 32-pixel fades and removes the clickable bars. It passes 10 DOM regression tests covering wrapper preservation, RTL overflow, fractional boundaries, resize handling, observer cleanup, AJAX replacements, and coexistence with Core wrappers. The DOM tests do not verify the visual fade treatment. Core prototype browser checks cover the fades at both edges, keyboard scrolling, fitting tables, and the unchanged mobile layout. Broader browser and assistive-technology testing remains outstanding.

Released version 0.1.6 passed 13 DOM regression tests and PHP/JavaScript syntax checks. Coverage included directional scrolling, reduced motion, focus return, control cleanup, AJAX replacements, and coexistence with Core wrappers. The CSS and scroll-control logic matched the Core prototype at that time, with plugin-specific wrapping, translated labels, and a fallback focus color. Browser and assistive-technology coverage was limited; the DOM tests did not verify visual layout.

Version 0.1.5 uses WordPress's RTL page class for shadow direction. All nine DOM regression tests and PHP syntax checks pass. Source review confirms the Core and plugin shadow rules match and the generated Core RTL styles mirror the shadows once. Browser checks remain pending.

Version 0.1.4 passes the nine DOM regression tests, including both edge states in left-to-right and right-to-left layouts, fractional boundaries, overscroll, fitting tables with stale scroll offsets, resizing, and cleanup of both shadow classes. Browser checks of the two shadows and native rubber-band/back-forward gestures remain pending.

Version 0.1.3 passes the DOM regression tests for shadow visibility in left-to-right and right-to-left layouts, fractional scroll positions and overscroll, viewport and table resizing, and observer cleanup and reinitialization after AJAX table replacement. Browser checks of 0.1.3 remain pending.

Version 0.1.2 used the CSS-only shadow from the Core prototype. Chromium checks on Core covered desktop Posts, a fitting Users table, and unchanged mobile layout. A fixture using the generated Core RTL stylesheet covered right-to-left scrolling at the start, middle, and end, plus resizing between fitting and overflowing tables. Browser checks of the packaged plugin and Safari/Firefox coverage remain pending.

Version 0.1.1 was installed from its ZIP on the same test site. Chromium checks confirmed that the Comments icon and sort arrows stay together in both header and footer at 783, 1000, and 1440 pixels, including ascending and descending sorting. At 782 pixels, visible columns, widths, and sampled row heights matched 0.1.0 exactly.

Version 0.1.0 was installed from its ZIP on unmodified WordPress 7.1.2 with PHP 8.4 and Yoast SEO 28.5. Chromium checks covered desktop widths, unchanged mobile measurements, Quick Edit saving, keyboard scrolling, Plugins live-search replacement, public-page asset isolation, and deactivation restoring the original layout.

The DOM regression tests cover preservation of table nodes and event handlers, navigation placement, existing wrappers, nested tables, and AJAX table replacement. Broader browser, assistive-technology, multisite, and third-party compatibility testing remains part of the prototype.

## License

[GNU General Public License v2.0 or later](LICENSE).
