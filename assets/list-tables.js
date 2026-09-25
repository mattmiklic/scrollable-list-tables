( function () {
	'use strict';

	function initialize() {
		const content = document.getElementById( 'wpbody-content' );
		if ( ! content ) {
			return;
		}

		const selector = 'table.wp-list-table.widefat';
		const label = window.scrollableListTablesSettings.label;
		const tables = new Map();

		/**
		 * Tracks a table's scroll position and dimensions.
		 *
		 * @param {HTMLTableElement} table The table inside a scroll wrapper.
		 * @return {void}
		 */
		function observeTableOverflow( table ) {
			const wrapper = table.parentElement;

			/**
			 * Updates the overflow indicator at each edge with hidden content.
			 *
			 * @return {void}
			 */
			function update() {
				const isRTL = window.getComputedStyle( wrapper ).direction === 'rtl';
				const scrollLeft = isRTL ? -wrapper.scrollLeft : wrapper.scrollLeft;
				const maxScroll = Math.max( 0, wrapper.scrollWidth - wrapper.clientWidth );
				const position = Math.min( maxScroll, Math.max( 0, scrollLeft ) );

				// Allow for fractional scroll positions at either end of the table.
				wrapper.classList.toggle( 'has-scroll-overflow-start', position > 1 );
				wrapper.classList.toggle( 'has-scroll-overflow-end', maxScroll - position > 1 );
			}

			const observer = new window.ResizeObserver( update );
			observer.observe( wrapper );
			observer.observe( table );
			wrapper.addEventListener( 'scroll', update, { passive: true } );
			update();

			tables.set( table, {
				wrapper: wrapper,
				cleanup: function() {
					observer.disconnect();
					wrapper.removeEventListener( 'scroll', update );
					wrapper.classList.remove( 'has-scroll-overflow-start', 'has-scroll-overflow-end' );
				}
			} );
		}

		const wrappers = new WeakSet();

		function wrap( table ) {
			if (
				! content.contains( table ) ||
				table.parentElement.closest( 'table' )
			) {
				return;
			}

			if ( ! table.parentElement.classList.contains( 'wp-list-table-scroll' ) ) {
				const wrapper = document.createElement( 'div' );
				wrapper.className = 'wp-list-table-scroll';
				wrapper.setAttribute( 'role', 'region' );
				wrapper.setAttribute( 'aria-label', label );
				wrapper.tabIndex = 0;
				table.before( wrapper );
				wrapper.append( table );
				wrappers.add( wrapper );
			}

			// Core owns wrappers already present in the page and tracks their overflow.
			if ( ! wrappers.has( table.parentElement ) ) {
				return;
			}

			if ( window.ResizeObserver && ! tables.has( table ) ) {
				observeTableOverflow( table );
			}
		}

		function wrapWithin( node ) {
			if ( node.nodeType !== Node.ELEMENT_NODE ) {
				return;
			}
			if ( node.matches( selector ) ) {
				wrap( node );
			}
			node.querySelectorAll( selector ).forEach( wrap );
		}

		function refreshTables() {
			tables.forEach( function( state, table ) {
				if ( ! content.contains( table ) || table.parentElement !== state.wrapper ) {
					state.cleanup();
					tables.delete( table );
				}
			} );

			wrapWithin( content );
		}

		refreshTables();

		// Plugins live search replaces the table along with its surrounding form content.
		const observer = new MutationObserver( refreshTables );
		observer.observe( content, { childList: true, subtree: true } );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initialize, { once: true } );
	} else {
		initialize();
	}
}() );
