<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A player's single leaderboard line: deepest descent, and this week's best Weekly Rift time with its ghost. */
class Entry extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'player_id';

    protected $keyType = 'string';

    protected $fillable = ['player_id', 'best', 'cls', 'lvl', 'para', 'week', 'time', 'ghost', 'gcls'];

    protected $casts = ['best' => 'integer', 'lvl' => 'integer', 'para' => 'integer', 'time' => 'float'];

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    /** Works whether the row was loaded whole or as a board line (which carries has_ghost instead of the path). */
    public function hasGhost(): bool
    {
        return array_key_exists('has_ghost', $this->attributes)
            ? (bool) $this->attributes['has_ghost']
            : ($this->ghost !== null && $this->ghost !== '');
    }

    /** The shape the game reads. The ghost path is long, so lists carry only whether one exists. */
    public function toGame(bool $withGhost): array
    {
        return [
            'best' => $this->best,
            'cls' => $this->cls,
            'lvl' => $this->lvl,
            'para' => $this->para,
            'week' => $this->week ?? '',
            'time' => $this->time,
            'gcls' => $this->gcls ?? '',
            'ghost' => $withGhost ? ($this->ghost ?? '') : ($this->hasGhost() ? '1' : ''),
            'at' => $this->updated_at?->getTimestampMs(),
        ];
    }
}
