<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Each player's best time on each day's Daily Rift. Rows older than two weeks are pruned. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_times', function (Blueprint $table) {
            $table->id();
            $table->string('player_id', 16);
            $table->string('day', 10);            // UTC, written as the game writes it: 2026-11-16
            $table->string('code', 24);           // that day's rift code, e.g. HD-4-SB-1A2B3C
            $table->decimal('time', 8, 1);
            $table->string('cls', 12);
            $table->unsignedSmallInteger('lvl')->default(1);
            $table->timestamps();

            $table->unique(['player_id', 'day', 'code']);
            $table->index(['day', 'code', 'time']);
            $table->foreign('player_id')->references('id')->on('players')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_times');
    }
};
