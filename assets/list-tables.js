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
		const adminBar = document.getElementById( 'wpadminbar' );
		let iconFrame = 0;

		/**
		 * Positions the scroll icons once per animation frame.
		 *
		 * @return {void}
		 */
		function scheduleIconPositions() {
			if ( iconFrame ) {
				return;
			}

			iconFrame = window.requestAnimationFrame( function() {
				iconFrame = 0;
				tables.forEach( function( state ) {
					state.positionIcons();
				} );
			} );
		}

		/**
		 * Tracks a table's scroll position and dimensions.
		 *
		 * @param {HTMLTableElement} table The table inside a scroll wrapper.
		 * @return {void}
		 */
		function addScrollControls( table ) {
			const wrapper = table.parentElement;
			const edges = [ 'start', 'end' ].map( function( edge ) {
				const strip = document.createElement( 'div' );
				const button = document.createElement( 'button' );
				const icon = document.createElement( 'span' );
				const label = edge === 'start' ? window.scrollableListTablesSettings.previous : window.scrollableListTablesSettings.next;

				strip.className = 'wp-list-table-scroll-edge wp-list-table-scroll-edge-' + edge;
				button.type = 'button';
				button.setAttribute( 'aria-label', label );
				button.title = label;
				icon.className = 'dashicons dashicons-arrow-' + ( edge === 'start' ? 'left' : 'right' ) + '-alt2';
				icon.setAttribute( 'aria-hidden', 'true' );
				button.appendChild( icon );
				strip.appendChild( button );
				wrapper.appendChild( strip );

				button.addEventListener( 'click', function() {
					const isRTL = window.getComputedStyle( wrapper ).direction === 'rtl';
					const direction = ( edge === 'start' ? -1 : 1 ) * ( isRTL ? -1 : 1 );

					wrapper.scrollBy( {
						left: direction * Math.max( 1, wrapper.clientWidth - 64 ),
						behavior: window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 'instant' : 'smooth'
					} );
				} );

				return { strip: strip, button: button, edge: edge };
			} );

			/**
			 * Centers the icons in the visible portion of the scroll controls.
			 *
			 * @return {void}
			 */
			function positionIcons() {
				const bounds = edges[ 0 ].button.getBoundingClientRect();
				const toolbarBottom = adminBar ? adminBar.getBoundingClientRect().bottom : 0;
				const top = Math.max( bounds.top, toolbarBottom, 0 );
				const bottom = Math.min( bounds.bottom, window.innerHeight );

				if ( bottom <= top || ! bounds.height ) {
					return;
				}

				// Dashicons are 20 pixels tall; keep the icon within its button.
				const offset = Math.max( 0, Math.min( bounds.height - 20, ( top + bottom ) / 2 - bounds.top - 10 ) );
				wrapper.style.setProperty( '--wp-list-table-scroll-icon-top', offset + 'px' );
			}

			/**
			 * Shows a scroll control at each edge with hidden content.
			 *
			 * @return {void}
			 */
			function update() {
				const isRTL = window.getComputedStyle( wrapper ).direction === 'rtl';
				const scrollLeft = isRTL ? -wrapper.scrollLeft : wrapper.scrollLeft;
				const maxScroll = Math.max( 0, wrapper.scrollWidth - wrapper.clientWidth );
				const position = Math.min( maxScroll, Math.max( 0, scrollLeft ) );
				const focusedEdge = edges.find( function( edge ) {
					return document.activeElement === edge.button;
				} );

				// Allow for fractional scroll positions at either end of the table.
				wrapper.classList.toggle( 'has-scroll-overflow-start', position > 1 );
				wrapper.classList.toggle( 'has-scroll-overflow-end', maxScroll - position > 1 );

				// Keep keyboard focus in the table when its scroll control disappears.
				if ( focusedEdge && ! wrapper.classList.contains( 'has-scroll-overflow-' + focusedEdge.edge ) ) {
					wrapper.focus( { preventScroll: true } );
				}
			}

			const observer = new window.ResizeObserver( function() {
				update();
				scheduleIconPositions();
			} );
			observer.observe( wrapper );
			observer.observe( table );
			wrapper.addEventListener( 'scroll', update, { passive: true } );
			update();

			tables.set( table, {
				wrapper: wrapper,
				positionIcons: positionIcons,
				cleanup: function() {
					observer.disconnect();
					wrapper.removeEventListener( 'scroll', update );
					wrapper.classList.remove( 'has-scroll-overflow-start', 'has-scroll-overflow-end' );
					wrapper.style.removeProperty( '--wp-list-table-scroll-icon-top' );
					edges.forEach( function( edge ) {
						edge.strip.remove();
					} );
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

			// Core owns wrappers already present in the page and initializes their controls.
			if ( ! wrappers.has( table.parentElement ) ) {
				return;
			}

			if ( window.ResizeObserver && ! tables.has( table ) ) {
				addScrollControls( table );
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
			scheduleIconPositions();
		}

		refreshTables();
		window.addEventListener( 'scroll', scheduleIconPositions, { passive: true, capture: true } );
		window.addEventListener( 'resize', scheduleIconPositions );

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
