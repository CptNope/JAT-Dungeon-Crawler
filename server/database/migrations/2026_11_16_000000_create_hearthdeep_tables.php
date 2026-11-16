<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->string('id', 16)->primary();
            $table->char('token_hash', 64)->unique();
            $table->string('name', 32);
            $table->timestamps();
        });

        Schema::create('entries', function (Blueprint $table) {
            $table->string('player_id', 16)->primary();
            $table->unsignedInteger('best')->default(0);
            $table->string('cls', 12)->default('warrior');
            $table->unsignedSmallInteger('lvl')->default(1);
            $table->unsignedInteger('para')->default(0);
            $table->string('week', 10)->nullable();
            $table->decimal('time', 8, 1)->nullable();
            $table->mediumText('ghost')->nullable();
            $table->string('gcls', 12)->nullable();
            $table->timestamps();

            $table->foreign('player_id')->references('id')->on('players')->cascadeOnDelete();
            $table->index('best');
            $table->index(['week', 'time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entries');
        Schema::dropIfExists('players');
    }
};
