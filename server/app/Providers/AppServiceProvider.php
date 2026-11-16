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
        $who = fn (Request $request) => hash('sha256', (string) ($request->bearerToken() ?: $request->ip()));
        RateLimiter::for('party', fn (Request $request) => Limit::perMinute(240)->by('party:'.$who($request)));
        RateLimiter::for('party-talk', fn (Request $request) => Limit::perMinute(20)->by('talk:'.$who($request)));
    }
}
