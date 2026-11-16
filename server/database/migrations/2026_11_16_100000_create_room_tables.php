<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Party rooms. Both tables are short-lived: rows are dropped seconds or minutes after they stop being used. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_members', function (Blueprint $table) {
            $table->id();
            $table->string('room', 16);
            $table->string('player_id', 16);
            $table->text('presence')->nullable();      // where the player is and how they are doing, as the game sent it
            $table->unsignedBigInteger('seen_ms');      // last heard from, in milliseconds
            $table->unique(['room', 'player_id']);
            $table->index(['room', 'seen_ms']);
        });

        Schema::create('room_messages', function (Blueprint $table) {
            $table->id();
            $table->string('room', 16);
            $table->string('player_id', 16);
            $table->string('data', 255);
            $table->unsignedBigInteger('sent_ms');
            $table->index(['room', 'id']);
            $table->index('sent_ms');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_messages');
        Schema::dropIfExists('room_members');
    }
};
