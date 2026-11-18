<?php
/**
 * Plugin Name:       JAT Hearthdeep
 * Description:       Play Hearthdeep, the browser action RPG, on any page or post with the [hearthdeep] shortcode.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Jeremy Anderson Tech
 * Author URI:        https://jeremyanderson.tech/
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       jat-hearthdeep
 *
 * The game runs in a frame served from its own address, so WordPress never loads the game's code into your theme
 * and the game keeps working the same way everywhere it is embedded. Leaderboards come from the game's own server
 * (the address is set in the game build, not here), so nothing is stored in this site's database.
 *
 * Usage:
 *   [hearthdeep]                                   the game, 16:9, as wide as the content column
 *   [hearthdeep max_width="1100"]                  cap the width in pixels
 *   [hearthdeep rift="HD-4-SB-1A2B3C"]             open with a challenge rift waiting
 *   [hearthdeep src="https://play.example.com/"]   a copy of the game you host yourself (see the filter below)
 *
 * This plugin reads no request data and writes nothing: it has no forms, no AJAX and no REST routes.
 *
 * @package JAT_Hearthdeep
 */

defined( 'ABSPATH' ) || exit;

const JAT_HEARTHDEEP_DEFAULT_SRC = 'https://cptnope.github.io/JAT-Dungeon-Crawler/';

/**
 * Hosts a [hearthdeep src="..."] may point at. Anything else falls back to the default address, so an author
 * cannot use the shortcode to frame an arbitrary site. Add your own host with:
 *
 *   add_filter( 'jat_hearthdeep_allowed_hosts', fn( $hosts ) => array_merge( $hosts, array( 'play.example.com' ) ) );
 *
 * @return string[]
 */
function jat_hearthdeep_allowed_hosts() {
	$hosts = array( (string) wp_parse_url( JAT_HEARTHDEEP_DEFAULT_SRC, PHP_URL_HOST ) );
	$hosts = apply_filters( 'jat_hearthdeep_allowed_hosts', $hosts );
	return array_map( 'strtolower', array_filter( (array) $hosts, 'is_string' ) );
}

/**
 * The address to frame: the default (filterable), or an https address on an allowed host.
 *
 * @param string $src Address from the shortcode, possibly empty.
 * @return string
 */
function jat_hearthdeep_src( $src ) {
	$default = (string) apply_filters( 'jat_hearthdeep_src', JAT_HEARTHDEEP_DEFAULT_SRC );
	$src     = trim( (string) $src );
	if ( '' === $src ) {
		return $default;
	}
	$parts = wp_parse_url( $src );
	if ( empty( $parts['scheme'] ) || 'https' !== strtolower( $parts['scheme'] ) || empty( $parts['host'] ) ) {
		return $default;
	}
	return in_array( strtolower( $parts['host'] ), jat_hearthdeep_allowed_hosts(), true ) ? $src : $default;
}

/**
 * [hearthdeep] shortcode.
 *
 * @param array|string $atts Shortcode attributes.
 * @return string
 */
function jat_hearthdeep_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'src'       => '',
			'max_width' => '',
			'rift'      => '',
		),
		$atts,
		'hearthdeep'
	);

	$src = jat_hearthdeep_src( $atts['src'] );

	// a challenge rift, if given and well-formed: HD-<tier>-<modifiers>-<seed>
	$rift = strtoupper( trim( (string) $atts['rift'] ) );
	if ( '' !== $rift && preg_match( '/^HD-\d{1,2}-[SBHEGLVDF]{1,3}-[0-9A-Z]{1,8}$/', $rift ) ) {
		$src = add_query_arg( 'rift', rawurlencode( $rift ), $src );
	}

	$max   = absint( $atts['max_width'] );
	$style = $max > 0 ? 'max-width:' . $max . 'px;' : '';

	wp_enqueue_style( 'jat-hearthdeep' );

	return sprintf(
		'<div class="jat-hearthdeep" style="%1$s"><div class="jat-hearthdeep__frame"><iframe src="%2$s" title="%3$s" loading="lazy" allow="gamepad; fullscreen; autoplay; clipboard-write; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="jat-hearthdeep__open"><a href="%2$s" target="_blank" rel="noopener">%4$s</a></p></div>',
		esc_attr( $style ),
		esc_url( $src ),
		esc_attr__( 'Hearthdeep, a browser action RPG', 'jat-hearthdeep' ),
		esc_html__( 'Open the game in its own tab', 'jat-hearthdeep' )
	);
}
add_shortcode( 'hearthdeep', 'jat_hearthdeep_shortcode' );

/**
 * A few lines of layout, registered here and printed only on pages that use the shortcode.
 */
function jat_hearthdeep_register_style() {
	wp_register_style( 'jat-hearthdeep', false, array(), '1.0.0' );
	wp_add_inline_style(
		'jat-hearthdeep',
		'.jat-hearthdeep{margin-left:auto;margin-right:auto}'
		. '.jat-hearthdeep__frame{position:relative;width:100%;aspect-ratio:16/9;min-height:420px;background:#0c0b12;border-radius:6px;overflow:hidden}'
		. '.jat-hearthdeep__frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}'
		. '.jat-hearthdeep__open{margin:.5em 0 0;font-size:.875em;text-align:right}'
		. '@media (max-width:600px){.jat-hearthdeep__frame{aspect-ratio:auto;height:80vh;min-height:0}}'
	);
}
add_action( 'wp_enqueue_scripts', 'jat_hearthdeep_register_style' );
