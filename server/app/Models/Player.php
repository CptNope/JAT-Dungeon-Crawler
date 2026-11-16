<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * One browser's identity on the leaderboards. There are no accounts, emails or passwords: the game is handed a
 * random token once, keeps it in the browser, and sends it back to prove a score is its own. Only the token's
 * hash is stored here.
 */
class Player extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'token_hash', 'name'];

    protected $hidden = ['token_hash'];

    public function entry(): HasOne
    {
        return $this->hasOne(Entry::class);
    }
}
