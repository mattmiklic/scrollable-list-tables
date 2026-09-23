const assert = require( 'node:assert/strict' );
const { readFileSync } = require( 'node:fs' );
const { join } = require( 'node:path' );
const { test } = require( 'node:test' );
const { JSDOM } = require( 'jsdom' );

const script = readFileSync( join( __dirname, '../assets/list-tables.js' ), 'utf8' );

async function start( markup, prepare = () => {} ) {
	const dom = new JSDOM( markup, { runScripts: 'outside-only' } );
	dom.window.scrollableListTablesSettings = { label: 'Posts & pages' };
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

for ( const direction of [ 'ltr', 'rtl' ] ) {
	test( `tracks remaining columns in ${ direction }, including fractional positions and overscroll`, async () => {
		const size = { viewport: 400, table: 1000 };
		const dom = await start( `<main id="wpbody-content"><div class="wp-list-table-scroll" style="direction: ${ direction }"><table class="wp-list-table widefat"></table></div></main>`, ( document ) => {
			dimensions( document.querySelector( '.wp-list-table-scroll' ), size );
		} );
		const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
		const sign = direction === 'rtl' ? -1 : 1;
		const visible = () => wrapper.classList.contains( 'has-scroll-overflow' );
		assert.equal( visible(), true, 'The start has remaining columns.' );
		scroll( dom.window, wrapper, sign * 300 );
		assert.equal( visible(), true, 'The middle has remaining columns.' );
		scroll( dom.window, wrapper, sign * 599.5 );
		assert.equal( visible(), false, 'A fractional end position does not leave a shadow.' );
		scroll( dom.window, wrapper, sign * 600 );
		assert.equal( visible(), false, 'The end has no remaining columns.' );
		scroll( dom.window, wrapper, sign * 650 );
		assert.equal( visible(), false, 'Overscrolling past the end keeps the shadow hidden.' );
		scroll( dom.window, wrapper, sign * -50 );
		assert.equal( visible(), true, 'Overscrolling before the start keeps the shadow visible.' );
		size.table = size.viewport;
		dom.resizeObservers[ 0 ].notify();
		assert.equal( visible(), false, 'Start-edge overscroll cannot create overflow on a fitting table.' );
		dom.window.close();
	} );
}

test( 'observes both viewport and table sizes as columns fit or overflow', async () => {
	const size = { viewport: 400, table: 1000 };
	const dom = await start( '<main id="wpbody-content"><div class="wp-list-table-scroll"><table class="wp-list-table widefat"></table></div></main>', ( document ) => {
		dimensions( document.querySelector( '.wp-list-table-scroll' ), size );
	} );
	const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
	const table = wrapper.querySelector( 'table' );
	assert.equal( dom.resizeObservers.length, 1 );
	const observer = dom.resizeObservers[ 0 ];
	assert.deepEqual( observer.targets, new Set( [ wrapper, table ] ) );
	size.viewport = 1000;
	observer.notify();
	assert.equal( wrapper.classList.contains( 'has-scroll-overflow' ), false );
	size.table = 1400;
	observer.notify();
	assert.equal( wrapper.classList.contains( 'has-scroll-overflow' ), true );
	size.table = 800;
	observer.notify();
	assert.equal( wrapper.classList.contains( 'has-scroll-overflow' ), false );
	dom.window.close();
} );

test( 'cleans up removed AJAX tables and reinitializes tables replaced inside a retained wrapper', async () => {
	const size = { viewport: 400, table: 1000 };
	const dom = await start( '<main id="wpbody-content"><form><div class="wp-list-table-scroll"><table class="wp-list-table widefat"></table></div></form></main>', ( document ) => {
		dimensions( document.querySelector( '.wp-list-table-scroll' ), size );
	} );
	const document = dom.window.document;
	const originalWrapper = document.querySelector( '.wp-list-table-scroll' );
	const originalObserver = dom.resizeObservers[ 0 ];
	assert.equal( originalWrapper.classList.contains( 'has-scroll-overflow' ), true );
	document.querySelector( 'form' ).innerHTML = '<table class="wp-list-table widefat" id="replacement"></table>';
	await flush( dom.window );
	const replacement = document.querySelector( '#replacement' );
	const wrapper = replacement.parentElement;
	assert.equal( originalObserver.disconnected, true );
	assert.equal( originalWrapper.classList.contains( 'has-scroll-overflow' ), false );
	scroll( dom.window, originalWrapper, 0 );
	assert.equal( originalWrapper.classList.contains( 'has-scroll-overflow' ), false, 'The removed wrapper no longer handles scrolling.' );
	assert.equal( dom.resizeObservers.length, 2 );
	const replacementObserver = dom.resizeObservers[ 1 ];
	assert.deepEqual( replacementObserver.targets, new Set( [ wrapper, replacement ] ) );
	dimensions( wrapper, size );
	replacementObserver.notify();
	assert.equal( wrapper.classList.contains( 'has-scroll-overflow' ), true );
	wrapper.innerHTML = '<table class="wp-list-table widefat" id="retained-wrapper-table"></table>';
	await flush( dom.window );
	assert.equal( replacementObserver.disconnected, true );
	assert.equal( dom.resizeObservers.length, 3 );
	assert.deepEqual( dom.resizeObservers[ 2 ].targets, new Set( [ wrapper, document.querySelector( '#retained-wrapper-table' ) ] ) );
	assert.equal( wrapper.classList.contains( 'has-scroll-overflow' ), true, 'The replacement immediately measures the retained wrapper.' );
	assert.equal( document.querySelectorAll( '.wp-list-table-scroll' ).length, 1 );
	dom.window.close();
} );

test( 'avoids duplicate observers on unrelated mutations and reuses existing Core wrappers', async () => {
	const dom = await start( '<main id="wpbody-content"><div class="wp-list-table-scroll"><table class="wp-list-table widefat"><tbody></tbody></table></div></main>' );
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
	dom.window.close();
} );

test( 'preserves scrolling wrappers when ResizeObserver is unavailable', async () => {
	const dom = await start( '<main id="wpbody-content"><table class="wp-list-table widefat"></table></main>', ( document ) => {
		delete document.defaultView.ResizeObserver;
	} );
	const wrapper = dom.window.document.querySelector( '.wp-list-table-scroll' );
	assert.ok( wrapper );
	assert.equal( wrapper.classList.contains( 'has-scroll-overflow' ), false );
	assert.equal( dom.resizeObservers.length, 0 );
	dom.window.close();
} );
