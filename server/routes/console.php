<?php

use App\Http\Controllers\RoomController;
use App\Models\Entry;
use App\Models\Player;
use App\Support\Boards;
use App\Support\Names;
use App\Support\Week;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/*
| Housekeeping for whoever runs the server. There is no admin website: these run over SSH.
|   php artisan hearthdeep:check                 is everything set up?
|   php artisan hearthdeep:players [search]      who is on the boards
|   php artisan hearthdeep:rename <id> <name>    change a display name
|   php artisan hearthdeep:remove <id>           remove a player and their scores
|   php artisan hearthdeep:prune                 drop players who joined but never sent a score
*/

Artisan::command('hearthdeep:check', function () {
    $ok = true;
    $line = function (bool $pass, string $what, string $fix = '') use (&$ok) {
        $ok = $ok && $pass;
        $this->line(($pass ? '<info>ok  </info> ' : '<error>FIX </error> ').$what.($pass || $fix === '' ? '' : "\n      ".$fix));
    };
    $note = fn (string $what) => $this->line('<comment>note</comment> '.$what);

    try {
        DB::connection()->getPdo();
        $line(true, 'Database connects ('.DB::connection()->getDriverName().')');
        $line(DB::getSchemaBuilder()->hasTable('players') && DB::getSchemaBuilder()->hasTable('entries') && DB::getSchemaBuilder()->hasTable('room_members'), 'Tables exist', 'Run: php artisan migrate --force');
    } catch (Throwable $e) {
        $line(false, 'Database connects', 'Check DB_* in .env. The error was: '.Str::limit($e->getMessage(), 160));
    }
    try {
        $probe = Str::random(8);
        Cache::put('hd:check', $probe, 30);
        $line(Cache::get('hd:check') === $probe, 'Cache reads back what it writes ('.config('cache.default').')', 'Check CACHE_STORE in .env; "file" always works.');
    } catch (Throwable $e) {
        $line(false, 'Cache works', 'Set CACHE_STORE=file in .env, or run the migrations if it is "database". '.Str::limit($e->getMessage(), 120));
    }
    $line(is_writable(storage_path('logs')) && is_writable(storage_path('framework/cache')), 'storage/ is writable', 'On Cloudways: Application Settings, Reset Permissions.');
    $line((string) config('app.key') !== '', 'APP_KEY is set', 'Run: php artisan key:generate');
    $line(! config('app.debug'), 'APP_DEBUG is off', 'Set APP_DEBUG=false in .env: debug pages show your settings to visitors.');
    $line(str_starts_with((string) config('app.url'), 'https://'), 'APP_URL is https ('.config('app.url').')', 'The game is served over https; browsers will not let it call an http server.');

    $origins = config('hearthdeep.origins');
    $bad = array_filter($origins, fn ($o) => ! preg_match('#^https?://[^/]+$#', $o));
    $line($origins !== [] && $bad === [], 'HEARTHDEEP_ORIGINS: '.implode(', ', $origins), 'Each must be scheme://host with no path or trailing slash, e.g. https://cptnope.github.io');
    if (count($origins) === 1) {
        $note('Only one website may call this server. Add others (your own domain, https://html-classic.itch.zone) when the game is served from them.');
    }
    $note('This week is '.Week::key().'. Players: '.(rescue(fn () => Player::count(), '?', false)).', with scores: '.(rescue(fn () => Entry::count(), '?', false)).'.');
    $this->line($ok ? "\n<info>Ready.</info> Next: open ".rtrim((string) config('app.url'), '/').'/api/v1/status in a browser.' : "\n<error>Not ready yet.</error> Fix the lines marked FIX and run this again.");

    return $ok ? 0 : 1;
})->purpose('Check that the server is set up correctly');

Artisan::command('hearthdeep:players {search? : Part of a name or id}', function (?string $search = null) {
    $rows = Player::query()->with('entry')
        ->when($search, fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', "%$search%")->orWhere('id', 'like', "%$search%")))
        ->orderByDesc('created_at')->limit(50)->get()
        ->map(fn (Player $p) => [$p->id, $p->name, $p->entry?->best ?? '-', $p->entry?->time ? $p->entry->week.'  '.$p->entry->time.'s' : '-', $p->created_at?->toDateString()]);
    $this->table(['id', 'name', 'deepest', 'weekly', 'joined'], $rows);
})->purpose('List players (newest first), optionally filtered');

Artisan::command('hearthdeep:rename {id} {name}', function (string $id, string $name) {
    $player = Player::find($id);
    if (! $player) {
        $this->error('No player with that id.');

        return 1;
    }
    $player->update(['name' => Names::clean($name)]);
    Boards::changed();
    $this->info("$id is now \"{$player->name}\".");

    return 0;
})->purpose('Change a player\'s display name');

Artisan::command('hearthdeep:remove {id}', function (string $id) {
    $player = Player::find($id);
    if (! $player) {
        $this->error('No player with that id.');

        return 1;
    }
    Entry::where('player_id', $id)->delete();
    DB::table('room_members')->where('player_id', $id)->delete();
    $player->delete();
    Boards::changed();
    $this->info("Removed {$player->name} ($id) and their scores. Their browser will be told its token is unknown and will join again as a new player.");

    return 0;
})->purpose('Remove a player and their scores');

Artisan::command('hearthdeep:prune {--days=30 : Leave players who joined more recently than this}', function () {
    RoomController::sweep();
    $n = Player::query()->whereDoesntHave('entry')->where('created_at', '<', now()->subDays(max(1, (int) $this->option('days'))))->delete();
    $this->info("Removed $n player(s) who joined and never sent a score.");

    return 0;
})->purpose('Drop players who never sent a score');
