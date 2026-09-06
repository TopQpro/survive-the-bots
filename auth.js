"use strict";

/*
    Survive the Bots
    Authentication helper
    Version 1.3.2
*/


// ============================================================
// CURRENT PLAYER
// ============================================================

function getCurrentPlayer() {

    try {

        const saved =
            localStorage.getItem("stb_player");

        if (!saved) {
            return null;
        }

        const player =
            JSON.parse(saved);

        if (!player || !player.id) {

            localStorage.removeItem(
                "stb_player"
            );

            return null;
        }

        return player;

    } catch (error) {

        console.error(
            "Fout bij lezen van speler:",
            error
        );

        localStorage.removeItem(
            "stb_player"
        );

        return null;
    }
}


// ============================================================
// SAVE CURRENT PLAYER
// ============================================================

function saveCurrentPlayer(player) {

    if (!player || !player.id) {

        console.error(
            "Ongeldige speler:",
            player
        );

        return false;
    }

    try {

        localStorage.setItem(
            "stb_player",
            JSON.stringify(player)
        );

        return true;

    } catch (error) {

        console.error(
            "Speler kon niet worden opgeslagen:",
            error
        );

        return false;
    }
}


// ============================================================
// CLEAR PLAYER
// ============================================================

function clearCurrentPlayer() {

    localStorage.removeItem(
        "stb_player"
    );
}


// ============================================================
// REQUIRE LOGIN
// ============================================================

function requireLogin() {

    const player =
        getCurrentPlayer();

    if (!player) {

        window.location.href =
            "index.html";

        return null;
    }

    return player;
}


// ============================================================
// REQUIRE ADMIN
// ============================================================

function requireAdmin() {

    const player =
        requireLogin();

    if (!player) {
        return null;
    }

    if (player.role !== "admin") {

        alert(
            "Je hebt geen toegang tot de adminpagina."
        );

        window.location.href =
            "game.html";

        return null;
    }

    return player;
}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    clearCurrentPlayer();

    window.location.href =
        "index.html";
}


// ============================================================
// UPDATE PLAYER DATA
// ============================================================

function updateCurrentPlayer(changes) {

    const player =
        getCurrentPlayer();

    if (!player) {
        return null;
    }

    const updatedPlayer = {
        ...player,
        ...changes
    };

    if (
        saveCurrentPlayer(
            updatedPlayer
        )
    ) {

        return updatedPlayer;
    }

    return null;
}


// ============================================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================================

window.getCurrentPlayer =
    getCurrentPlayer;

window.saveCurrentPlayer =
    saveCurrentPlayer;

window.clearCurrentPlayer =
    clearCurrentPlayer;

window.requireLogin =
    requireLogin;

window.requireAdmin =
    requireAdmin;

window.updateCurrentPlayer =
    updateCurrentPlayer;

window.logout =
    logout;
