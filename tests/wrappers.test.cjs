const assert = require( 'node:assert/strict' );
const { readFileSync } = require( 'node:fs' );
const { join } = require( 'node:path' );
const { test } = require( 'node:test' );
const { JSDOM } = require( 'jsdom' );

const script = readFileSync( join( __dirname, '../assets/list-tables.js' ), 'utf8' );

async function start( markup, prepare = () => {} ) {
	const dom = new JSDOM( markup, { runScripts: 'outside-only', pretendToBeVisual: true } );
	dom.window.scrollableListTablesSettings = { label: 'Posts & pages', previous: 'Scroll to previous columns', next: 'Scroll to next columns' };
	dom.window.matchMedia = () => ( { matches: false } );
	dom.resizeObservers = [];
	dom.window.ResizeObserver = class {
		constructor( callback ) {
			this.callback = callback;
			this.targets = new Set();
			this.disconnected = false;
			dom.resizeObservers.push( this );
		}
		observe( target ) {
			this.targets.add( target );
		}
		disconnect() {
			this.targets.clear();
			this.disconnected = true;
		}
		notify() {
			if ( ! this.disconnected ) {
				this.callback();
			}
		}
	};
	prepare( dom.window.document );
	dom.window.eval( script );
	dom.window.document.dispatchEvent( new dom.window.Event( 'DOMContentLoaded' ) );
	await new Promise( ( resolve ) => dom.window.setTimeout( resolve, 0 ) );
	return dom;
}

test( 'preserves the table, its handlers, and surrounding controls', async () => {
	let originalTable;
	let clicks = 0;
	const dom = await start( '<main id="wpbody-content"><form><div class="tablenav">Top</div><h2>Posts</h2><table class="wp-list-table widefat"><tbody><tr><td><button>Quick Edit</button></td></tr></tbody></table><div class="tablenav">Bottom</div></form></main>', ( document ) => {
		originalTable = document.querySelector( 'table' );
		originalTable.querySelector( 'button' ).addEventListener( 'click', ( event ) => {
			event.preventDefault();
			clicks++;
		} );
	} );
	const document = dom.window.document;
	const wrapper = document.querySelector( '.wp-list-table-scroll' );
	assert.ok( wrapper, 'The existing table receives a scroll wrapper.' );
	assert.equal( wrapper.firstElementChild, originalTable );
	assert.equal( wrapper.getAttribute( 'role' ), 'region' );
	assert.equal( wrapper.getAttribute( 'aria-label' ), 'Posts & pages' );
	assert.equal( wrapper.tabIndex, 0 );
	assert.equal( wrapper.querySelectorAll( '.tablenav, h2' ).length, 0 );
	originalTable.querySelector( 'button' ).click();
	assert.equal( clicks, 1 );
	dom.window.close();
} );

test( 'reuses Core wrappers and leaves nested tables, grid views, and outside content alone', async () => {
	const dom = await start( '<table class="wp-list-table widefat" id="outside"></table><main id="wpbody-content"><div class="wp-list-table-scroll"><table class="wp-list-table widefat" id="existing"><tbody><tr><td><table class="wp-list-table widefat" id="nested"></table></td></tr></tbody></table></div><div class="wp-list-table widefat" id="grid"></div></main>' );
	const document = dom.window.document;
	assert.equal( document.querySelectorAll( '.wp-list-table-scroll' ).length, 1 );
	assert.equal( document.querySelector( '#outside' ).parentElement.tagName, 'BODY' );
	assert.equal( document.querySelector( '#nested' ).parentElement.tagName, 'TD' );
	assert.equal( document.querySelector( '#grid' ).parentElement.id, 'wpbody-content' );
	dom.window.close();
} );

test( 'restores the wrapper after Plugins live search replaces its table', async () => {
	const dom = await start( '<main id="wpbody-content"><form><table class="wp-list-table widefat"></table></form></main>' );
	const document = dom.window.document;
	document.querySelector( 'form' ).innerHTML = '<div class="tablenav">New controls</div><table class="wp-list-table widefat" id="replacement"></table>';
	await new Promise( ( resolve ) => dom.window.setTimeout( resolve, 0 ) );
	assert.equal( document.querySelectorAll( '.wp-list-table-scroll' ).length, 1 );
	assert.equal( document.querySelector( '#replacement' ).parentElement.className, 'wp-list-table-scroll' );
	assert.equal( document.querySelector( '.tablenav' ).parentElement.tagName, 'FORM' );
	dom.window.close();
} );

async function startTable( size, direction = 'ltr' ) {
	const dom = await start( '<main id="wpbody-content"><form><table class="wp-list-table widefat"><tbody></tbody></table></form></main>' );
	const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
	wrapper.style.direction = direction;
	dimensions( wrapper, size );
	dom.resizeObservers[ 0 ].notify();
	return dom;
}

function dimensions( wrapper, size ) {
	Object.defineProperties( wrapper, {
		clientWidth: { configurable: true, get: () => size.viewport },
		scrollWidth: { configurable: true, get: () => size.table }
	} );
}

function scroll( window, wrapper, position ) {
	wrapper.scrollLeft = position;
	wrapper.dispatchEvent( new window.Event( 'scroll' ) );
}

function flush( window ) {
	return new Promise( ( resolve ) => window.setTimeout( resolve, 0 ) );
}

function overflowEdges( wrapper ) {
	return [
		wrapper.classList.contains( 'has-scroll-overflow-start' ),
		wrapper.classList.contains( 'has-scroll-overflow-end' )
	];
}

for ( const direction of [ 'ltr', 'rtl' ] ) {
	test( `tracks hidden columns at both edges in ${ direction }, including fractional positions and overscroll`, async () => {
		const size = { viewport: 400, table: 1000 };
		const dom = await startTable( size, direction );
		const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
		const sign = direction === 'rtl' ? -1 : 1;
		assert.deepEqual( overflowEdges( wrapper ), [ false, true ], 'Only the end edge is active initially.' );
		for ( const [ position, expected ] of [
			[ 0, [ false, true ] ],
			[ 0.5, [ false, true ] ],
			[ 1, [ false, true ] ],
			[ 1.5, [ true, true ] ],
			[ 300, [ true, true ] ],
			[ 598.5, [ true, true ] ],
			[ 599, [ true, false ] ],
			[ 599.5, [ true, false ] ],
			[ 600, [ true, false ] ],
			[ 650, [ true, false ] ],
			[ -50, [ false, true ] ]
		] ) {
			scroll( dom.window, wrapper, sign * position );
			assert.deepEqual( overflowEdges( wrapper ), expected, `Correct edges at logical position ${ position }.` );
		}
		for ( const position of [ 300, -50 ] ) {
			scroll( dom.window, wrapper, sign * position );
			size.table = size.viewport;
			dom.resizeObservers[ 0 ].notify();
			assert.deepEqual( overflowEdges( wrapper ), [ false, false ], 'A fitting table has no active edges despite a stale scroll offset.' );
			size.table = size.viewport - 50;
			dom.resizeObservers[ 0 ].notify();
			assert.deepEqual( overflowEdges( wrapper ), [ false, false ], 'A narrower table also has no active edges.' );
			size.table = 1000;
		}
		dom.window.close();
	} );
}

test( 'observes both viewport and table sizes as columns fit or overflow', async () => {
	const size = { viewport: 400, table: 1000 };
	const dom = await startTable( size );
	const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
	const table = wrapper.querySelector( 'table' );
	assert.equal( dom.resizeObservers.length, 1 );
	const observer = dom.resizeObservers[ 0 ];
	assert.deepEqual( observer.targets, new Set( [ wrapper, table ] ) );
	scroll( dom.window, wrapper, 300 );
	assert.deepEqual( overflowEdges( wrapper ), [ true, true ] );
	size.viewport = 1000;
	observer.notify();
	assert.deepEqual( overflowEdges( wrapper ), [ false, false ] );
	size.table = 1400;
	observer.notify();
	assert.deepEqual( overflowEdges( wrapper ), [ true, true ] );
	size.table = 800;
	observer.notify();
	assert.deepEqual( overflowEdges( wrapper ), [ false, false ] );
	dom.window.close();
} );

test( 'cleans up removed AJAX tables and reinitializes tables replaced inside a retained wrapper', async () => {
	const size = { viewport: 400, table: 1000 };
	const dom = await startTable( size );
	const document = dom.window.document;
	const originalWrapper = document.querySelector( '.wp-list-table-scroll' );
	const originalObserver = dom.resizeObservers[ 0 ];
	scroll( dom.window, originalWrapper, 300 );
	assert.deepEqual( overflowEdges( originalWrapper ), [ true, true ] );
	document.querySelector( 'form' ).innerHTML = '<table class="wp-list-table widefat" id="replacement"></table>';
	await flush( dom.window );
	const replacement = document.querySelector( '#replacement' );
	const wrapper = replacement.parentElement;
	assert.equal( originalObserver.disconnected, true );
	assert.equal( originalWrapper.querySelectorAll( '.wp-list-table-scroll-edge' ).length, 0 );
	assert.deepEqual( overflowEdges( originalWrapper ), [ false, false ], 'Cleanup removes both overflow classes.' );
	scroll( dom.window, originalWrapper, 0 );
	assert.deepEqual( overflowEdges( originalWrapper ), [ false, false ], 'The removed wrapper no longer handles scrolling.' );
	assert.equal( dom.resizeObservers.length, 2 );
	const replacementObserver = dom.resizeObservers[ 1 ];
	assert.deepEqual( replacementObserver.targets, new Set( [ wrapper, replacement ] ) );
	dimensions( wrapper, size );
	replacementObserver.notify();
	assert.deepEqual( overflowEdges( wrapper ), [ false, true ] );
	scroll( dom.window, wrapper, 300 );
	assert.deepEqual( overflowEdges( wrapper ), [ true, true ] );
	wrapper.innerHTML = '<table class="wp-list-table widefat" id="retained-wrapper-table"></table>';
	await flush( dom.window );
	assert.equal( replacementObserver.disconnected, true );
	assert.equal( dom.resizeObservers.length, 3 );
	assert.deepEqual( dom.resizeObservers[ 2 ].targets, new Set( [ wrapper, document.querySelector( '#retained-wrapper-table' ) ] ) );
	assert.deepEqual( overflowEdges( wrapper ), [ true, true ], 'The replacement immediately measures both edges of the retained wrapper.' );
	assert.equal( document.querySelectorAll( '.wp-list-table-scroll' ).length, 1 );
	dom.window.close();
} );

test( 'avoids duplicate controls and observers on unrelated mutations', async () => {
	const dom = await startTable( { viewport: 400, table: 1000 } );
	const document = dom.window.document;
	assert.equal( dom.resizeObservers.length, 1 );
	const wrapper = document.querySelector( '.wp-list-table-scroll' );
	document.querySelector( 'tbody' ).innerHTML = '<tr><td>Updated content</td></tr>';
	document.querySelector( 'main' ).append( document.createElement( 'p' ) );
	await flush( dom.window );
	assert.equal( dom.resizeObservers.length, 1 );
	assert.equal( dom.resizeObservers[ 0 ].disconnected, false );
	assert.equal( document.querySelectorAll( '.wp-list-table-scroll' ).length, 1 );
	assert.equal( document.querySelector( 'table' ).parentElement, wrapper );
	assert.equal( wrapper.querySelectorAll( '.wp-list-table-scroll-edge' ).length, 2 );
	dom.window.close();
} );

test( 'preserves scrolling wrappers when ResizeObserver is unavailable', async () => {
	const dom = await start( '<main id="wpbody-content"><table class="wp-list-table widefat"></table></main>', ( document ) => {
		delete document.defaultView.ResizeObserver;
	} );
	const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
	assert.ok( wrapper );
	assert.deepEqual( overflowEdges( wrapper ), [ false, false ] );
	assert.equal( dom.resizeObservers.length, 0 );
	dom.window.close();
} );

for ( const direction of [ 'ltr', 'rtl' ] ) {
	test( `native controls page in ${ direction } and respect reduced motion`, async () => {
		const dom = await startTable( { viewport: 400, table: 1000 }, direction );
		const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
		const buttons = wrapper.querySelectorAll( '.wp-list-table-scroll-edge button' );
		const calls = [];
		wrapper.scrollBy = ( options ) => calls.push( [ options.left, options.behavior ] );
		const sign = direction === 'rtl' ? -1 : 1;
		assert.equal( buttons.length, 2 );
		assert.equal( buttons[ 0 ].type, 'button' );
		assert.equal( buttons[ 1 ].type, 'button' );
		assert.equal( buttons[ 0 ].getAttribute( 'aria-label' ), 'Scroll to previous columns' );
		assert.equal( buttons[ 1 ].getAttribute( 'aria-label' ), 'Scroll to next columns' );
		assert.equal( buttons[ 1 ].firstElementChild.getAttribute( 'aria-hidden' ), 'true' );
		buttons[ 1 ].click();
		buttons[ 0 ].click();
		dom.window.matchMedia = () => ( { matches: true } );
		buttons[ 1 ].click();
		assert.deepEqual( calls, [ [ sign * 336, 'smooth' ], [ -sign * 336, 'smooth' ], [ sign * 336, 'instant' ] ] );
		dom.window.close();
	} );
}

test( 'returns focus to the region when the focused control reaches its boundary', async () => {
	const dom = await startTable( { viewport: 400, table: 1000 } );
	const document = dom.window.document;
	const wrapper = document.querySelector( '.wp-list-table-scroll' );
	const previous = wrapper.querySelector( '.wp-list-table-scroll-edge-start button' );
	const next = wrapper.querySelector( '.wp-list-table-scroll-edge-end button' );
	next.focus();
	assert.equal( document.activeElement, next );
	scroll( dom.window, wrapper, 600 );
	assert.equal( document.activeElement, wrapper );
	previous.focus();
	scroll( dom.window, wrapper, 0 );
	assert.equal( document.activeElement, wrapper );
	dom.window.close();
} );

test( 'leaves Core wrappers alone before and after Core initializes its controls', async () => {
	const dom = await start( '<main id="wpbody-content"><div class="wp-list-table-scroll"><table class="wp-list-table widefat"></table></div></main>' );
	const document = dom.window.document;
	const wrapper = document.querySelector( '.wp-list-table-scroll' );
	assert.equal( dom.resizeObservers.length, 0 );
	assert.equal( wrapper.querySelectorAll( 'button' ).length, 0 );
	const coreControl = document.createElement( 'div' );
	coreControl.className = 'wp-list-table-scroll-edge';
	wrapper.append( coreControl );
	await flush( dom.window );
	assert.equal( wrapper.querySelectorAll( '.wp-list-table-scroll-edge' ).length, 1 );
	assert.equal( dom.resizeObservers.length, 0 );
	dom.window.close();
} );
