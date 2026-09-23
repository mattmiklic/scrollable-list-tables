const assert = require( 'node:assert/strict' );
const { readFileSync } = require( 'node:fs' );
const { join } = require( 'node:path' );
const { test } = require( 'node:test' );
const { JSDOM } = require( 'jsdom' );

const script = readFileSync( join( __dirname, '../assets/list-tables.js' ), 'utf8' );

async function start( markup, prepare = () => {} ) {
	const dom = new JSDOM( markup, { runScripts: 'outside-only' } );
	dom.window.scrollableListTablesSettings = { label: 'Posts & pages' };
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
