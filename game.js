"use strict";

/*
============================================================
 SURVIVE THE BOTS
 game.js
 Version: 1.3.3
============================================================
*/


// ============================================================
// SUPABASE
// ============================================================

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ============================================================
// STATE
// ============================================================

let session = null;
let user = null;
let profile = null;

let gameRunning = false;
let scoreSaved = false;

let health = 100;
let kills = 0;
let wave = 1;
let score = 0;
let coins = 0;

let bots = [];
let bullets = [];

let keys = {};

let mouseX = 0;
let mouseY = 0;

let lastShot = 0;

let waveTimer = null;


// ============================================================
// WEAPON
// ============================================================

let weapon = {
    id: "pistol",
    name: "Pistol",
    damage: 25,
    fire_rate: 300,
    bullets: 1,
    spread: 0,
    bullet_speed: 12
};


// ============================================================
// ELEMENTS
// ============================================================

const game = document.getElementById("game");
const player = document.getElementById("player");

const usernameElement =
    document.getElementById("username");

const healthElement =
    document.getElementById("health");

const killsElement =
    document.getElementById("kills");

const waveElement =
    document.getElementById("wave");

const scoreElement =
    document.getElementById("score");

const coinsElement =
    document.getElementById("coins");

const startOverlay =
    document.getElementById("startOverlay");

const gameOverOverlay =
    document.getElementById("gameOverOverlay");

const finalScore =
    document.getElementById("finalScore");

const finalKills =
    document.getElementById("finalKills");

const finalWave =
    document.getElementById("finalWave");

const crosshair =
    document.getElementById("crosshair");

const damageFlash =
    document.getElementById("damageFlash");

const adminButton =
    document.getElementById("adminButton");


// ============================================================
// AUTHENTICATIE
// ============================================================

async function checkAuth() {

    try {

        /*
         * Eerst kijken of er een echte Supabase sessie is.
         */

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();


        if (error) {

            console.warn(
                "Supabase sessie kon niet worden gelezen:",
                error.message
            );
        }


        session =
            data?.session || null;


        /*
         * ----------------------------------------------------
         * NIEUWE AUTH
         * ----------------------------------------------------
         */

        if (session) {

            user = session.user;

            await loadProfile();

        }


        /*
         * ----------------------------------------------------
         * EIGEN / LOKALE LOGIN
         * ----------------------------------------------------
         *
         * Dit is momenteel belangrijk voor jullie project.
         */

        if (!user) {

            const saved =
                localStorage.getItem(
                    "stb_player"
                );


            if (!saved) {

                location.href =
                    "index.html";

                return false;
            }


            try {

                const playerData =
                    JSON.parse(saved);


                if (
                    !playerData
                    ||
                    !playerData.id
                ) {

                    throw new Error(
                        "Ongeldige speler."
                    );
                }


                user = {
                    id: playerData.id
                };


                profile =
                    playerData;


                coins =
                    Number(
                        playerData.coins || 0
                    );


                if (usernameElement) {

                    usernameElement.textContent =
                        playerData.username || "-";
                }


                if (coinsElement) {

                    coinsElement.textContent =
                        coins;
                }


                if (
                    playerData.role === "admin"
                    &&
                    adminButton
                ) {

                    adminButton.classList.remove(
                        "hidden"
                    );
                }

            } catch (error) {

                console.error(
                    "Lokale login fout:",
                    error
                );


                localStorage.removeItem(
                    "stb_player"
                );


                location.href =
                    "index.html";

                return false;
            }
        }


        /*
         * Wapens mogen niet verhinderen dat
         * de game start.
         */

        await giveDefaultWeapons();
        await loadWeapon();

        updateHud();

        return true;

    } catch (error) {

        console.error(
            "checkAuth fout:",
            error
        );


        /*
         * Niet meteen terugsturen wanneer de
         * lokale login nog geldig is.
         */

        const saved =
            localStorage.getItem(
                "stb_player"
            );


        if (!saved) {

            location.href =
                "index.html";

            return false;
        }


        return true;
    }
}


// ============================================================
// PROFIEL LADEN
// ============================================================

async function loadProfile() {

    if (!user || !user.id) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select(
                "id,username,coins,role"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


        if (!error && data) {

            profile = data;


            coins =
                Number(
                    data.coins || 0
                );


            if (usernameElement) {

                usernameElement.textContent =
                    data.username || "-";
            }


            if (coinsElement) {

                coinsElement.textContent =
                    coins;
            }


            if (
                data.role === "admin"
                &&
                adminButton
            ) {

                adminButton.classList.remove(
                    "hidden"
                );
            }


            return;
        }

    } catch (error) {

        console.warn(
            "Profiel laden:",
            error
        );
    }


    /*
     * Fallback naar lokale speler.
     */

    const saved =
        localStorage.getItem(
            "stb_player"
        );


    if (!saved) {
        return;
    }


    try {

        profile =
            JSON.parse(saved);


        coins =
            Number(
                profile.coins || 0
            );


        if (usernameElement) {

            usernameElement.textContent =
                profile.username || "-";
        }


        if (coinsElement) {

            coinsElement.textContent =
                coins;
        }


        if (
            profile.role === "admin"
            &&
            adminButton
        ) {

            adminButton.classList.remove(
                "hidden"
            );
        }

    } catch (error) {

        console.warn(
            "Lokale profieldata:",
            error
        );
    }
}


// ============================================================
// DEFAULT WAPENS
// ============================================================

async function giveDefaultWeapons() {

    if (!user || !user.id) {
        return;
    }


    try {

        const {
            error
        } = await supabaseClient.rpc(
            "give_default_weapons",
            {
                p_user_id: user.id
            }
        );


        if (error) {

            console.warn(
                "Default wapens:",
                error.message
            );
        }

    } catch (error) {

        console.warn(
            "Default wapens:",
            error
        );
    }
}


// ============================================================
// WAPEN LADEN
// ============================================================

async function loadWeapon() {

    if (!user) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient.rpc(
            "get_my_weapons"
        );


        if (error) {

            console.warn(
                "Wapens laden:",
                error.message
            );

            return;
        }


        if (
            !data
            ||
            !Array.isArray(data)
            ||
            data.length === 0
        ) {

            return;
        }


        const selectedId =
            localStorage.getItem(
                "stb_selected_weapon"
            );


        let selected =
            data.find(
                weaponData =>
                    weaponData.weapon_id === selectedId
            );


        if (!selected) {

            selected =
                data.find(
                    weaponData =>
                        weaponData.weapon_id === "pistol"
                );
        }


        if (!selected) {

            selected =
                data[0];
        }


        if (selected) {

            weapon = {

                id:
                    selected.weapon_id ||
                    "pistol",

                name:
                    selected.name ||
                    "Wapen",

                damage:
                    Number(
                        selected.damage || 25
                    ),

                fire_rate:
                    Number(
                        selected.fire_rate || 300
                    ),

                bullets:
                    Number(
                        selected.bullets || 1
                    ),

                spread:
                    Number(
                        selected.spread || 0
                    ),

                bullet_speed:
                    Number(
                        selected.bullet_speed || 12
                    )
            };
        }

    } catch (error) {

        console.warn(
            "Wapen fout:",
            error
        );
    }
}


// ============================================================
// INPUT
// ============================================================

document.addEventListener(
    "keydown",
    function(event) {

        keys[
            event.key.toLowerCase()
        ] = true;

    }
);


document.addEventListener(
    "keyup",
    function(event) {

        keys[
            event.key.toLowerCase()
        ] = false;

    }
);


// ============================================================
// MOUSE
// ============================================================

game.addEventListener(
    "mousemove",
    function(event) {

        const rect =
            game.getBoundingClientRect();


        mouseX =
            event.clientX -
            rect.left;


        mouseY =
            event.clientY -
            rect.top;


        if (crosshair) {

            crosshair.style.display =
                "block";


            crosshair.style.left =
                event.clientX + "px";


            crosshair.style.top =
                event.clientY + "px";
        }
    }
);


game.addEventListener(
    "mouseleave",
    function() {

        if (crosshair) {

            crosshair.style.display =
                "none";
        }
    }
);


game.addEventListener(
    "mousedown",
    function(event) {

        if (event.button === 0) {

            shoot();
        }
    }
);


// ============================================================
// START GAME
// ============================================================

function startGame() {

    clearObjects();


    if (waveTimer) {

        clearTimeout(
            waveTimer
        );

        waveTimer = null;
    }


    health = 100;
    kills = 0;
    wave = 1;
    score = 0;

    scoreSaved = false;

    gameRunning = true;

    lastShot = 0;


    player.style.left =
        "50%";

    player.style.top =
        "50%";


    startOverlay.classList.add(
        "hidden"
    );


    gameOverOverlay.classList.add(
        "hidden"
    );


    updateHud();

    spawnWave();


    requestAnimationFrame(
        gameLoop
    );
}


// ============================================================
// GAME LOOP
// ============================================================

function gameLoop() {

    if (!gameRunning) {
        return;
    }


    movePlayer();

    moveBots();

    moveBullets();

    botCollision();


    requestAnimationFrame(
        gameLoop
    );
}


// ============================================================
// PLAYER
// ============================================================

function movePlayer() {

    const speed = 5;


    let x =
        parseFloat(
            player.style.left
        );


    let y =
        parseFloat(
            player.style.top
        );


    if (Number.isNaN(x)) {
        x = 50;
    }


    if (Number.isNaN(y)) {
        y = 50;
    }


    if (
        keys["w"]
        ||
        keys["arrowup"]
    ) {

        y -=
            speed /
            game.clientHeight *
            100;
    }


    if (
        keys["s"]
        ||
        keys["arrowdown"]
    ) {

        y +=
            speed /
            game.clientHeight *
            100;
    }


    if (
        keys["a"]
        ||
        keys["arrowleft"]
    ) {

        x -=
            speed /
            game.clientWidth *
            100;
    }


    if (
        keys["d"]
        ||
        keys["arrowright"]
    ) {

        x +=
            speed /
            game.clientWidth *
            100;
    }


    x =
        Math.max(
            2,
            Math.min(
                98,
                x
            )
        );


    y =
        Math.max(
            3,
            Math.min(
                97,
                y
            )
        );


    player.style.left =
        x + "%";


    player.style.top =
        y + "%";
}


// ============================================================
// WAVE
// ============================================================

function spawnWave() {

    const count =
        5 +
        wave * 2;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        spawnBot();
    }
}


// ============================================================
// BOT
// ============================================================

function spawnBot() {

    const element =
        document.createElement(
            "div"
        );


    let type =
        "normal";


    let hp =
        1 +
        Math.floor(
            wave / 4
        );


    let speed =
        .7 +
        Math.random() *
        .35;


    const random =
        Math.random();


    if (
        random < .18
        &&
        wave >= 2
    ) {

        type = "tank";


        hp =
            5 +
            wave;


        speed =
            .45 +
            Math.random() *
            .2;


        element.className =
            "bot tank";

    } else if (
        random < .38
        &&
        wave >= 2
    ) {

        type = "fast";


        hp = 1;


        speed =
            1.1 +
            Math.random() *
            .4;


        element.className =
            "bot fast";

    } else {

        element.className =
            "bot";
    }


    let x;
    let y;


    const side =
        Math.floor(
            Math.random() * 4
        );


    if (side === 0) {

        x =
            Math.random() *
            game.clientWidth;

        y = -30;

    } else if (side === 1) {

        x =
            game.clientWidth +
            30;

        y =
            Math.random() *
            game.clientHeight;

    } else if (side === 2) {

        x =
            Math.random() *
            game.clientWidth;

        y =
            game.clientHeight +
            30;

    } else {

        x = -30;

        y =
            Math.random() *
            game.clientHeight;
    }


    element.style.left =
        x + "px";


    element.style.top =
        y + "px";


    game.appendChild(
        element
    );


    bots.push({

        element,
        x,
        y,
        hp,
        type,
        speed
    });
}


// ============================================================
// BOT MOVEMENT
// ============================================================

function moveBots() {

    const px =
        game.clientWidth *
        parseFloat(
            player.style.left
        ) /
        100;


    const py =
        game.clientHeight *
        parseFloat(
            player.style.top
        ) /
        100;


    bots.forEach(
        function(bot) {

            const dx =
                px -
                bot.x;


            const dy =
                py -
                bot.y;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (
                distance > 1
            ) {

                bot.x +=
                    dx /
                    distance *
                    bot.speed;


                bot.y +=
                    dy /
                    distance *
                    bot.speed;
            }


            bot.element.style.left =
                bot.x + "px";


            bot.element.style.top =
                bot.y + "px";

        }
    );
}


// ============================================================
// SHOOT
// ============================================================

function shoot() {

    if (!gameRunning) {
        return;
    }


    const now =
        Date.now();


    if (
        now -
        lastShot <
        weapon.fire_rate
    ) {

        return;
    }


    lastShot =
        now;


    const px =
        game.clientWidth *
        parseFloat(
            player.style.left
        ) /
        100;


    const py =
        game.clientHeight *
        parseFloat(
            player.style.top
        ) /
        100;


    const angle =
        Math.atan2(
            mouseY - py,
            mouseX - px
        );


    for (
        let i = 0;
        i < weapon.bullets;
        i++
    ) {

        const spread =
            (
                Math.random() -
                .5
            ) *
            weapon.spread;


        const bulletAngle =
            angle +
            spread;


        const element =
            document.createElement(
                "div"
            );


        element.className =
            "bullet";


        element.style.left =
            px + "px";


        element.style.top =
            py + "px";


        game.appendChild(
            element
        );


        bullets.push({

            element,

            x: px,

            y: py,

            vx:
                Math.cos(
                    bulletAngle
                ) *
                weapon.bullet_speed,

            vy:
                Math.sin(
                    bulletAngle
                ) *
                weapon.bullet_speed,

            damage:
                weapon.damage
        });
    }
}


// ============================================================
// BULLETS
// ============================================================

function moveBullets() {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        bullet.x +=
            bullet.vx;


        bullet.y +=
            bullet.vy;


        bullet.element.style.left =
            bullet.x + "px";


        bullet.element.style.top =
            bullet.y + "px";


        let hit = false;


        for (
            let j = bots.length - 1;
            j >= 0;
            j--
        ) {

            const bot =
                bots[j];


            const dx =
                bullet.x -
                bot.x;


            const dy =
                bullet.y -
                bot.y;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            const hitDistance =
                bot.type === "tank"
                    ? 35
                    : bot.type === "fast"
                        ? 20
                        : 25;


            if (
                distance <
                hitDistance
            ) {

                bot.hp -=
                    bullet.damage;


                bullet.element.remove();


                bullets.splice(
                    i,
                    1
                );


                hit = true;


                if (
                    bot.hp <= 0
                ) {

                    killBot(j);
                }


                break;
            }
        }


        if (hit) {
            continue;
        }


        if (
            bullet.x < -50
            ||
            bullet.y < -50
            ||
            bullet.x >
                game.clientWidth + 50
            ||
            bullet.y >
                game.clientHeight + 50
        ) {

            bullet.element.remove();


            bullets.splice(
                i,
                1
            );
        }
    }
}


// ============================================================
// KILL BOT
// ============================================================

function killBot(index) {

    const bot =
        bots[index];


    if (!bot) {
        return;
    }


    bot.element.remove();


    bots.splice(
        index,
        1
    );


    kills++;


    if (
        bot.type === "tank"
    ) {

        score += 40;

    } else if (
        bot.type === "fast"
    ) {

        score += 15;

    } else {

        score += 10;
    }


    updateHud();


    if (
        bots.length === 0
    ) {

        wave++;


        score +=
            wave * 20;


        updateHud();


        waveTimer =
            setTimeout(
                function() {

                    if (
                        gameRunning
                    ) {

                        spawnWave();
                    }

                },
                700
            );
    }
}


// ============================================================
// BOT COLLISION
// ============================================================

function botCollision() {

    const px =
        game.clientWidth *
        parseFloat(
            player.style.left
        ) /
        100;


    const py =
        game.clientHeight *
        parseFloat(
            player.style.top
        ) /
        100;


    bots.forEach(
        function(bot) {

            const dx =
                px -
                bot.x;


            const dy =
                py -
                bot.y;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (
                distance < 28
            ) {

                if (
                    bot.type === "tank"
                ) {

                    health -= .9;

                } else {

                    health -= .45;
                }


                if (damageFlash) {

                    damageFlash.style.display =
                        "block";


                    setTimeout(
                        function() {

                            damageFlash.style.display =
                                "none";

                        },
                        70
                    );
                }


                if (
                    health <= 0
                ) {

                    health = 0;

                    endGame();
                }


                updateHud();
            }

        }
    );
}


// ============================================================
// HUD
// ============================================================

function updateHud() {

    if (healthElement) {

        healthElement.textContent =
            Math.round(
                health
            );
    }


    if (killsElement) {

        killsElement.textContent =
            kills;
    }


    if (waveElement) {

        waveElement.textContent =
            wave;
    }


    if (scoreElement) {

        scoreElement.textContent =
            score;
    }


    if (coinsElement) {

        coinsElement.textContent =
            coins;
    }
}


// ============================================================
// GAME OVER
// ============================================================

async function endGame() {

    if (!gameRunning) {
        return;
    }


    gameRunning = false;


    if (waveTimer) {

        clearTimeout(
            waveTimer
        );

        waveTimer = null;
    }


    finalScore.textContent =
        score;


    finalKills.textContent =
        kills;


    finalWave.textContent =
        wave;


    gameOverOverlay.classList.remove(
        "hidden"
    );


    /*
     * Score onmiddellijk opslaan.
     */

    await saveScore();
}


// ============================================================
// SCORE OPSLAAN
// ============================================================

async function saveScore() {

    /*
     * Beschermt tegen dubbele opslag.
     */

    if (scoreSaved) {

        console.warn(
            "Score was al opgeslagen."
        );

        return false;
    }


    if (!user || !user.id) {

        console.error(
            "Score kan niet worden opgeslagen: geen user.id."
        );

        return false;
    }


    scoreSaved = true;


    console.log(
        "Score opslaan...",
        {
            user_id: user.id,
            score: score,
            kills: kills,
            wave: wave
        }
    );


    /*
     * --------------------------------------------------------
     * BELANGRIJK
     * --------------------------------------------------------
     *
     * We proberen eerst de bestaande RPC.
     */

    try {

        const {
            data,
            error
        } = await supabaseClient.rpc(
            "save_game_score",
            {
                p_user_id: user.id,
                p_score: score,
                p_kills: kills,
                p_wave: wave
            }
        );


        if (!error) {

            console.log(
                "✅ Score succesvol opgeslagen.",
                data
            );


            /*
             * Coins lokaal bijwerken.
             */

            coins +=
                kills +
                wave * 5;


            updateHud();


            /*
             * Lokale speler ook bijwerken.
             */

            updateLocalPlayerCoins();


            return true;
        }


        /*
         * Als de RPC nog de oude parameters gebruikt,
         * krijgen we hier een fout.
         */

        console.error(
            "save_game_score fout:",
            error
        );


        /*
         * Niet stilzwijgend doen alsof het gelukt is.
         */

        scoreSaved = false;


        return false;

    } catch (error) {

        console.error(
            "Onverwachte fout bij score opslaan:",
            error
        );


        scoreSaved = false;


        return false;
    }
}


// ============================================================
// LOKALE COINS BIJWERKEN
// ============================================================

function updateLocalPlayerCoins() {

    const saved =
        localStorage.getItem(
            "stb_player"
        );


    if (!saved) {
        return;
    }


    try {

        const playerData =
            JSON.parse(saved);


        playerData.coins =
            coins;


        localStorage.setItem(
            "stb_player",
            JSON.stringify(
                playerData
            )
        );

    } catch (error) {

        console.warn(
            "Lokale coins konden niet worden bijgewerkt:",
            error
        );
    }
}


// ============================================================
// OBJECTEN OPRUIMEN
// ============================================================

function clearObjects() {

    bots.forEach(
        function(bot) {

            if (
                bot.element
                &&
                bot.element.remove
            ) {

                bot.element.remove();
            }
        }
    );


    bullets.forEach(
        function(bullet) {

            if (
                bullet.element
                &&
                bullet.element.remove
            ) {

                bullet.element.remove();
            }
        }
    );


    bots = [];

    bullets = [];
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        gameRunning = false;


        await supabaseClient.auth.signOut();

    } catch (error) {

        console.warn(
            "Uitloggen:",
            error
        );
    }


    localStorage.removeItem(
        "stb_player"
    );


    location.href =
        "index.html";
}


// ============================================================
// GLOBALE FUNCTIES
// ============================================================

window.startGame =
    startGame;

window.logout =
    logout;

window.shoot =
    shoot;


// ============================================================
// INITIALISATIE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const authenticated =
            await checkAuth();


        if (!authenticated) {
            return;
        }


        updateHud();

    }
);
