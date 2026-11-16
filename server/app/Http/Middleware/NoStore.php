<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API replies must not be held by a cache in front of PHP (Varnish, a CDN) or by the browser: a board cached for
 * hours would look frozen. The boards are already cached for a few seconds inside the application.
 */
class NoStore
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
