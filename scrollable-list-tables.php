<?php
/**
 * Plugin Name: Scrollable List Tables
 * Description: Try readable desktop admin columns with horizontal table scrolling. The existing mobile layout is preserved.
 * Version: 0.1.1
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: scrollable-list-tables
 * Update URI: false
 *
 * @package ScrollableListTables
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Load the prototype on Core list screens, including their network equivalents.
 */
function scrollable_list_tables_enqueue_assets() {
	$screen = get_current_screen();
	if ( ! $screen ) {
		return;
	}

	$base = preg_replace( '/-network$/', '', $screen->base );
	$list_screens = array(
		'edit',
		'upload',
		'edit-comments',
		'users',
		'edit-tags',
		'plugins',
		'sites',
		'themes',
		'site-users',
		'site-themes',
		'link-manager',
		'export-personal-data',
		'erase-personal-data',
	);
	if ( ! in_array( $base, $list_screens, true ) ) {
		return;
	}

	$handle = 'scrollable-list-tables';
	$url    = plugin_dir_url( __FILE__ ) . 'assets/';
	$label  = $screen->get_screen_reader_text( 'heading_list' );

	wp_enqueue_style( $handle, $url . 'list-tables.css', array( 'list-tables' ), '0.1.1' );
	wp_enqueue_script( $handle, $url . 'list-tables.js', array(), '0.1.1', true );
	wp_localize_script(
		$handle,
		'scrollableListTablesSettings',
		array( 'label' => $label ? $label : __( 'Items list', 'scrollable-list-tables' ) )
	);
}
// Load after Core's table styles and before plugins' usual priority-10 enqueues.
add_action( 'admin_enqueue_scripts', 'scrollable_list_tables_enqueue_assets', 0 );
