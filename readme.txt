=== Scrollable List Tables ===
Tags: admin, tables, responsive
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A small testing plugin for readable desktop admin columns and horizontal table scrolling.

== Description ==

This plugin lets people try a proposed improvement to WordPress's existing admin list tables without modifying WordPress itself.

Above 782 CSS pixels, text columns retain a readable minimum width and the table scrolls horizontally when it no longer fits. The border stays around the scrolling viewport. Filters, bulk actions, and pagination stay outside it. The scrolling region is keyboard focusable; use the arrow keys to scroll.

At 782 pixels and below, WordPress keeps its existing mobile layout and expandable row details. There is no truncation or sticky column behavior. Long plugin descriptions may still produce tall rows.

The plugin targets Core list screens: Posts and custom post types, Pages, Media list view, Comments, Users, Categories and Tags, Installed Plugins, and the corresponding network administration tables. Custom plugin administration pages are outside this initial test scope.

There are no settings, database changes, tracking, or external requests. A small admin script adds a wrapper around the existing table without replacing the table or its event handlers. CSS handles the layout. No Core or other plugin files are changed.

This is a 0.1.1 testing prototype. Plugin compatibility and accessibility feedback are welcome. It is not an official WordPress release.

== Installation ==

1. Go to Plugins > Add Plugin > Upload Plugin in WordPress.
2. Choose scrollable-list-tables-0.1.1.zip, then Install Now.
3. Activate Scrollable List Tables.
4. Open Posts and narrow the browser to roughly 900-1100 CSS pixels.

Deactivate the plugin and reload the page to compare the original layout. No cleanup or database migration is needed.

== What to test ==

* Use a staging or local site with a mix of short and long post titles.
* For extra columns, activate Yoast SEO and enable its SEO Title, Meta Desc., Keyphrase, score, and link-count columns in Screen Options. Yoast is optional and is not bundled.
* Resize the browser above and below 782 pixels.
* Scroll in both directions; check the border and access to the last column.
* Try keyboard scrolling, sorting, pagination, Screen Options, Quick Edit, and Bulk Edit.
* Check the other list screens you use, including Installed Plugins live search.

When reporting a problem, include the WordPress version, browser, admin screen, active plugins that add columns, approximate viewport width, and a screenshot if useful.

== Frequently Asked Questions ==

= Does this change my content or public website? =

No. It loads only on supported admin list screens and does not write to the database.

= Does this replace the tables with DataViews? =

No. It keeps the existing list tables, including their plugin columns and normal controls.

= Can I run it on the Core prototype branch? =

Yes. It reuses an existing wp-list-table-scroll wrapper instead of nesting another. Deactivating the plugin does not undo a separate Core patch.

== Changelog ==

= 0.1.1 =
* Keep the Comments column icon and sort arrows together in desktop table headers and footers.

= 0.1.0 =
* Initial testing release with desktop minimum widths, horizontal scrolling, and a viewport border.
