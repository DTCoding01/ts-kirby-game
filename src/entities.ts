import {
  AreaComp,
  BodyComp,
  DoubleJumpComp,
  GameObj,
  HealthComp,
  KaboomCtx,
  OpacityComp,
  PosComp,
  ScaleComp,
  SpriteComp,
} from "kaboom";
import { scale } from "./constants";

type PlayerGameObj = GameObj<
  SpriteComp &
    AreaComp &
    BodyComp &
    PosComp &
    ScaleComp &
    DoubleJumpComp &
    HealthComp &
    OpacityComp & {
      speed: number;
      direction: string;
      isInhaling: boolean;
      isFull: boolean;
    }
>;

export function makePlayer(k: KaboomCtx, posX: number, posY: number) {
  const player = k.make([
    k.sprite("assets", { anim: "kirbIdle" }),
    k.area({ shape: new k.Rect(k.vec2(4, 5.9), 8, 10) }),
    k.body(),
    k.pos(posX * scale, posY * scale),
    k.scale(scale),
    k.doubleJump(10),
    k.health(3),
    k.opacity(1),
    {
      speed: 300,
      direction: "right",
      isInhaling: false,
      isFull: false,
    },
    "player",
  ]);

  player.onCollide("enemy", async (enemy: GameObj) => {
    if (player.isInhaling && enemy.isInhalable) {
      player.isInhaling = false;
      k.destroy(enemy);
      player.isFull = true;
      return;
    }

    if (player.hp() === 0) {
      k.destroy(player);
      k.go("level-1");
      return;
    }

    player.hurt();
    await k.tween(
      player.opacity,
      0,
      0.05,
      (val) => (player.opacity = val),
      k.easings.linear
    );
    await k.tween(
      player.opacity,
      1,
      0.05,
      (val) => (player.opacity = val),
      k.easings.linear
    );
  });

  player.onCollide("exit", () => {
    k.go("level-2");
  });

  const inhaleEffect = k.add([
    k.sprite("assets", { anim: "kirbInhaleEffect" }),
    k.pos(),
    k.scale(scale),
    k.opacity(0),
    "inhaleEffect",
  ]);

  const inhaleZone = player.add([
    k.area({ shape: new k.Rect(k.vec2(0), 20, 4) }),
    k.pos(),
    "inhaleZone",
  ]);

  inhaleZone.onUpdate(() => {
    if (player.direction === "left") {
      inhaleZone.pos = k.vec2(-14, 8);
      inhaleEffect.pos = k.vec2(player.pos.x - 60, player.pos.y + 0);
      inhaleEffect.flipX = true;
      return;
    }
    inhaleZone.pos = k.vec2(14, 8);
    inhaleEffect.pos = k.vec2(player.pos.x + 60, player.pos.y + 0);
    inhaleEffect.flipX = false;
  });

  player.onUpdate(() => {
    if (player.pos.y > 2000) {
      k.go("level-1");
    }
  });

  return player;
}

export function setControls(k: KaboomCtx, player: PlayerGameObj) {
  const inhaleEffectRef = k.get("inhaleEffect")[0];

  k.onKeyDown((key) => {
    switch (key) {
      case "left":
        player.direction = "left";
        player.flipX = true;
        player.move(-player.speed, 0);
        break;
      case "right":
        player.direction = "right";
        player.flipX = false;
        player.move(player.speed, 0);
        break;
      case "shift":
        if (player.isFull) {
          player.play("kirbFull");
          inhaleEffectRef.opacity = 0;
          break;
        }

        player.isInhaling = true;
        player.play("kirbInhaling");
        inhaleEffectRef.opacity = 1;
        break;
      default:
    }
  });

  k.onKeyPress((key) => {
    switch (key) {
      case "space":
        player.doubleJump();
        break;
      default:
    }
  });

  k.onKeyRelease((key) => {
    if (key === "shift") {
      if (player.isFull) {
        player.play("kirbInhaling");
        const shootingStar = k.add([
          k.sprite("assets", {
            anim: "shootingStar",
            flipX: player.direction === "right",
          }),
          k.area({ shape: new k.Rect(k.vec2(5, 4), 6, 6) }),
          k.pos(
            player.direction === "left" ? player.pos.x - 80 : player.pos.x + 80,
            player.pos.y + 5
          ),
          k.scale(scale),
          player.direction === "left"
            ? k.move(k.LEFT, 800)
            : k.move(k.RIGHT, 800),
          "shootingStar",
        ]);
        shootingStar.onCollide("platform", () => k.destroy(shootingStar));

        player.isFull = false;
        k.wait(1, () => player.play("kirbIdle"));
        return;
      }

      inhaleEffectRef.opacity = 0;
      player.isInhaling = false;
      player.play("kirbIdle");
    }
  });
}
