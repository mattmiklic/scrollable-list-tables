( function () {
	'use strict';

	function initialize() {
		const content = document.getElementById( 'wpbody-content' );
		if ( ! content ) {
			return;
		}

		const selector = 'table.wp-list-table.widefat';
		const label = window.scrollableListTablesSettings.label;

		function wrap( table ) {
			if (
				! content.contains( table ) ||
				table.parentElement.closest( 'table' ) ||
				table.parentElement.classList.contains( 'wp-list-table-scroll' )
			) {
				return;
			}

			const wrapper = document.createElement( 'div' );
			wrapper.className = 'wp-list-table-scroll';
			wrapper.setAttribute( 'role', 'region' );
			wrapper.setAttribute( 'aria-label', label );
			wrapper.tabIndex = 0;
			table.before( wrapper );
			wrapper.append( table );
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

		wrapWithin( content );

		// Plugins live search replaces the table along with its surrounding form content.
		const observer = new MutationObserver( ( mutations ) => {
			for ( const mutation of mutations ) {
				mutation.addedNodes.forEach( wrapWithin );
			}
		} );
		observer.observe( content, { childList: true, subtree: true } );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initialize, { once: true } );
	} else {
		initialize();
	}
}() );
