<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Every limit has its own name and its own counter. (Laravel's bare "throttle:12,60" form counts all such
        // routes for an address together, so reading the boards a dozen times would have blocked joining.)
        $ip = fn (Request $request) => (string) $request->ip();
        RateLimiter::for('hd-read', fn (Request $request) => Limit::perMinute(120)->by('read:'.$ip($request)));
        RateLimiter::for('hd-join', fn (Request $request) => Limit::perHour(12)->by('join:'.$ip($request)));
        RateLimiter::for('hd-write', fn (Request $request) => Limit::perMinute(40)->by('write:'.$ip($request)));

        $who = fn (Request $request) => hash('sha256', (string) ($request->bearerToken() ?: $request->ip()));
        RateLimiter::for('party', fn (Request $request) => Limit::perMinute(240)->by('party:'.$who($request)));
        RateLimiter::for('party-talk', fn (Request $request) => Limit::perMinute(20)->by('talk:'.$who($request)));
    }
}
