=== JAT Hearthdeep ===
Contributors: cptnope
Tags: game, embed, shortcode, rpg
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.0.0

Play Hearthdeep, a free browser action RPG, on any page or post with the [hearthdeep] shortcode.

== Description ==

Adds one shortcode, `[hearthdeep]`, that places the game on a page in a responsive 16:9 frame. Keyboard and mouse, touch and game controllers all work inside the frame.

The game is loaded from its own address (by default https://cptnope.github.io/JAT-Dungeon-Crawler/). Players' progress is saved in their own browser. Leaderboards, when the game build has a server configured, are kept on that server. This plugin stores nothing in your WordPress database, adds no settings page, and handles no form, AJAX or REST requests.

= Shortcode =

* `[hearthdeep]` the game at the width of your content column
* `[hearthdeep max_width="1100"]` cap the width in pixels
* `[hearthdeep rift="HD-4-SB-1A2B3C"]` open with a challenge rift waiting
* `[hearthdeep src="https://play.example.com/"]` a copy of the game hosted elsewhere; the host must be allowed with the `jat_hearthdeep_allowed_hosts` filter

= External service =

This plugin embeds a page from cptnope.github.io (GitHub Pages) in a frame. Visitors' browsers request the game's files from that address when a page with the shortcode is viewed; GitHub's privacy statement applies to those requests: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement

== Installation ==

1. Upload the `jat-hearthdeep` folder to `/wp-content/plugins/`, or zip it and use Plugins, Add New, Upload.
2. Activate the plugin.
3. Add `[hearthdeep]` to a page. A full-width page template with no sidebar suits it best.

== Changelog ==

= 1.0.0 =
* First release.
