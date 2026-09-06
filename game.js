/*

============================================================
SURVIVE THE BOTS
Game JavaScript
Version 1.3.0
============================================================
*/
// ============================================================
// SUPABASE
// ============================================================

const supabaseClient =
supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

// ============================================================
// PLAYER
// ============================================================

let currentPlayer = null;
let profile = null;

// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;

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

let animationFrame = null;

// ============================================================
// DEFAULT WEAPON
// ============================================================

let weapon = {

damage: 25,

fire_rate: 300,

bullets: 1,

spread: 0,

bullet_speed: 12,

name: "Pistol"

};

// ============================================================
// ELEMENTS
// ============================================================

const game =
document.getElementById(
"game"
);

const player =
document.getElementById(
"player"
);

// ============================================================
// AUTH / PLAYER
// ============================================================

async function checkAuth() {

let saved;

try {

    saved =
        localStorage.getItem(
            "stb_player"
        );

} catch (error) {

    console.error(error);

    location.href =
        "index.html";

    return false;

}

if (!saved) {

    location.href =
        "index.html";

    return false;

}

try {

    currentPlayer =
        JSON.parse(saved);

} catch (error) {

    console.error(error);

    localStorage.removeItem(
        "stb_player"
    );

    location.href =
        "index.html";

    return false;

}

if (
    !currentPlayer ||
    !currentPlayer.id
) {

    localStorage.removeItem(
        "stb_player"
    );

    location.href =
        "index.html";

    return false;

}

document
    .getElementById(
        "username"
    )
    .textContent =
    currentPlayer.username ||
    "-";

await loadProfile();

await giveDefaults();

await loadWeapon();

updateHud();

return true;

}

// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {

/*
 * We proberen eerst profiles.
 * Als jouw project alleen players gebruikt,
 * proberen we daarna players.
 */

let result =
    await supabaseClient
        .from("profiles")
        .select(
            "username,coins,role"
        )
        .eq(
            "id",
            currentPlayer.id
        )
        .single();

if (
    result.error ||
    !result.data
) {

    result =
        await supabaseClient
            .from("players")
            .select(
                "username,coins,role"
            )
            .eq(
                "id",
                currentPlayer.id
            )
            .single();

}

if (
    result.error ||
    !result.data
) {

    console.error(
        "Profiel laden:",
        result.error
    );

    return;

}

profile =
    result.data;

coins =
    Number(
        profile.coins || 0
    );

document
    .getElementById(
        "username"
    )
    .textContent =
    profile.username ||
    currentPlayer.username ||
    "-";

document
    .getElementById(
        "coins"
    )
    .textContent =
    coins;

if (
    profile.role ===
    "admin"
) {

    document
        .getElementById(
            "adminButton"
        )
        .classList.remove(
            "hidden"
        );

}

}

// ============================================================
// DEFAULT WEAPONS
// ============================================================

async function giveDefaults() {

const {
    error
} =
    await supabaseClient.rpc(
        "give_default_weapons",
        {
            p_user_id:
                currentPlayer.id
        }
    );

if (error) {

    /*
     * Dit mag de game niet stoppen.
     */

    console.warn(
        "Default weapons:",
        error
    );

}

}

// ============================================================
// LOAD WEAPON
// ============================================================

async function loadWeapon() {

const {
    data,
    error
} =
    await supabaseClient.rpc(
        "get_my_weapons"
    );

if (error) {

    console.warn(
        "Wapens laden:",
        error
    );

    return;

}

if (
    !data ||
    !data.length
) {

    return;

}

/*
 * Probeer het momenteel geselecteerde
 * wapen te vinden.
 */

let selected =
    localStorage.getItem(
        "stb_selected_weapon"
    );

let found =
    data.find(
        item =>
            item.weapon_id ===
            selected
    );

/*
 * Als er geen geselecteerd wapen is,
 * gebruik pistol als die bestaat.
 */

if (!found) {

    found =
        data.find(
            item =>
                item.weapon_id ===
                "pistol"
        );

}

/*
 * Anders gebruiken we het eerste wapen.
 */

if (!found) {

    found =
        data[0];

}

if (found) {

    weapon = {

        damage:
            Number(
                found.damage ??
                25
            ),

        fire_rate:
            Number(
                found.fire_rate ??
                300
            ),

        bullets:
            Number(
                found.bullets ??
                1
            ),

        spread:
            Number(
                found.spread ??
                0
            ),

        bullet_speed:
            Number(
                found.bullet_speed ??
                12
            ),

        name:
            found.name ||
            "Wapen"

    };

}

const weaponElement =
    document.getElementById(
        "weapon"
    );

if (weaponElement) {

    weaponElement.textContent =
        weapon.name;

}

}

// ============================================================
// KEYBOARD
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

    const crosshair =
        document.getElementById(
            "crosshair"
        );

    crosshair.style.display =
        "block";

    crosshair.style.left =
        event.clientX + "px";

    crosshair.style.top =
        event.clientY + "px";

}

);

game.addEventListener(
"mouseleave",
function() {

    document
        .getElementById(
            "crosshair"
        )
        .style.display =
        "none";

}

);

game.addEventListener(
"mousedown",
function(event) {

    if (
        event.button === 0
    ) {

        shoot();

    }

}

);

// ============================================================
// START GAME
// ============================================================

function startGame() {

console.log(
    "Survive the Bots v1.3.0 gestart."
);

clearObjects();

health = 100;

kills = 0;

wave = 1;

score = 0;

gameRunning = true;

lastShot = 0;

player.style.left =
    "50%";

player.style.top =
    "50%";

document
    .getElementById(
        "startOverlay"
    )
    .classList.add(
        "hidden"
    );

document
    .getElementById(
        "gameOverOverlay"
    )
    .classList.add(
        "hidden"
    );

updateHud();

spawnWave();

if (animationFrame) {

    cancelAnimationFrame(
        animationFrame
    );

}

animationFrame =
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

animationFrame =
    requestAnimationFrame(
        gameLoop
    );

}

// ============================================================
// PLAYER MOVEMENT
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

if (isNaN(x)) {

    x = 50;

}

if (isNaN(y)) {

    y = 50;

}

if (
    keys["w"] ||
    keys["arrowup"]
) {

    y -=
        speed /
        game.clientHeight *
        100;

}

if (
    keys["s"] ||
    keys["arrowdown"]
) {

    y +=
        speed /
        game.clientHeight *
        100;

}

if (
    keys["a"] ||
    keys["arrowleft"]
) {

    x -=
        speed /
        game.clientWidth *
        100;

}

if (
    keys["d"] ||
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
    5 + wave * 2;

for (
    let i = 0;
    i < count;
    i++
) {

    spawnBot();

}

}

// ============================================================
// SPAWN BOT
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
    random < .18 &&
    wave >= 2
) {

    type =
        "tank";

    hp =
        5 + wave;

    speed =
        .45 +
        Math.random() *
        .2;

    element.className =
        "bot tank";

}

else if (
    random < .38 &&
    wave >= 2
) {

    type =
        "fast";

    hp = 1;

    speed =
        1.1 +
        Math.random() *
        .4;

    element.className =
        "bot fast";

}

else {

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

}

else if (side === 1) {

    x =
        game.clientWidth +
        30;

    y =
        Math.random() *
        game.clientHeight;

}

else if (side === 2) {

    x =
        Math.random() *
        game.clientWidth;

    y =
        game.clientHeight +
        30;

}

else {

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
// MOVE BOTS
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
    bot => {

        const dx =
            px - bot.x;

        const dy =
            py - bot.y;

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
    now - lastShot <
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

    const a =
        angle + spread;

    const bullet =
        document.createElement(
            "div"
        );

    bullet.className =
        "bullet";

    bullet.style.left =
        px + "px";

    bullet.style.top =
        py + "px";

    game.appendChild(
        bullet
    );

    bullets.push({

        element:
            bullet,

        x: px,

        y: py,

        vx:
            Math.cos(a) *
            weapon.bullet_speed,

        vy:
            Math.sin(a) *
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
    let i =
        bullets.length - 1;
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
        let j =
            bots.length - 1;
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
        bullet.x < -50 ||
        bullet.y < -50 ||
        bullet.x >
            game.clientWidth + 50 ||
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
    bot.type ===
    "tank"
) {

    score += 40;

}

else if (
    bot.type ===
    "fast"
) {

    score += 15;

}

else {

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

    setTimeout(
        function() {

            if (gameRunning) {

                spawnWave();

            }

        },
        600
    );

}

}

// ============================================================
// COLLISION
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
    bot => {

        const dx =
            px - bot.x;

        const dy =
            py - bot.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (
            distance < 28
        ) {

            health -=
                bot.type ===
                "tank"
                    ? .9
                    : .45;

            const flash =
                document
                    .getElementById(
                        "damageFlash"
                    );

            flash.style.display =
                "block";

            setTimeout(
                function() {

                    flash.style.display =
                        "none";

                },
                70
            );

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

document
    .getElementById(
        "health"
    )
    .textContent =
    Math.round(
        health
    );

document
    .getElementById(
        "kills"
    )
    .textContent =
    kills;

document
    .getElementById(
        "wave"
    )
    .textContent =
    wave;

document
    .getElementById(
        "score"
    )
    .textContent =
    score;

document
    .getElementById(
        "coins"
    )
    .textContent =
    coins;

}

// ============================================================
// GAME OVER
// ============================================================

async function endGame() {

if (!gameRunning) {

    return;

}

gameRunning = false;

if (animationFrame) {

    cancelAnimationFrame(
        animationFrame
    );

    animationFrame =
        null;

}

document
    .getElementById(
        "finalScore"
    )
    .textContent =
    score;

document
    .getElementById(
        "finalKills"
    )
    .textContent =
    kills;

document
    .getElementById(
        "finalWave"
    )
    .textContent =
    wave;

document
    .getElementById(
        "gameOverOverlay"
    )
    .classList.remove(
        "hidden"
    );

await saveScore();

}

// ============================================================
// SAVE SCORE
// ============================================================

async function saveScore() {

if (
    !currentPlayer ||
    !currentPlayer.id
) {

    return;

}

const {
    error
} =
    await supabaseClient.rpc(
        "save_game_score",
        {
            p_score: score,
            p_kills: kills,
            p_wave: wave
        }
    );

if (error) {

    console.error(
        "Score opslaan:",
        error
    );

    return;

}

/*
 * Voorlopig geven we lokaal de verdiende
 * coins weer. Je bestaande databasefunctie
 * kan dit eventueel al verwerken.
 */

coins +=
    kills +
    wave * 5;

document
    .getElementById(
        "coins"
    )
    .textContent =
    coins;

}

// ============================================================
// CLEAR OBJECTS
// ============================================================

function clearObjects() {

bots.forEach(
    bot => {

        if (
            bot.element
        ) {

            bot.element.remove();

        }

    }
);

bullets.forEach(
    bullet => {

        if (
            bullet.element
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

localStorage.removeItem(
    "stb_player"
);

location.href =
    "index.html";

}

// ============================================================
// START
// ============================================================

checkAuth();

// ============================================================
// BELANGRIJK
// ============================================================
//
// startGame() staat bewust globaal.
// Daardoor werkt:
//
// onclick="startGame()"
//
// in game.html.
//
// ============================================================