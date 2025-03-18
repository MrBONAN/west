import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card && card.quacks && card.swims;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Creature extends Card {
    constructor(...items) {
        super(...items);
    }

    get currentPower() {
        return this._currentPower || 0;
    }

    set currentPower(value) {
        this._currentPower = Math.min(this.maxPower, value);
    }

    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}


// Основа для утки.
class Duck extends Creature {
    constructor(name = "Мирная утка", power = 2) {
        super(name, power);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}


// Основа для собаки.
class Dog extends Creature {
    constructor(name = "Пёс-бандит", power = 3, image = undefined) {
        super(name, power, image);
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation));
    }

    getDescriptions() {
        return ["Уменьшает получаемый урон на 1", ...super.getDescriptions()];
    }
}


class Gatling extends Dog {
    constructor() {
        super('Гатлинг', 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositePlayerTable = gameContext.oppositePlayer.table;

        for (const oppositeCard of oppositePlayerTable) {
            taskQueue.push(onDone =>
                this.view.showAttack(() => this.dealDamageToCreature(2, oppositeCard, gameContext, onDone))
            );
        }

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ["Наносит 2 урона всем картам противника", ...super.getDescriptions()];
    }
}

class Lad extends Dog {
    constructor() {
        super('Браток', 2);
    }

    doAfterComingIntoPlay(...items) {
        super.doAfterComingIntoPlay(...items);
        Lad.setInGameCount(Lad.getInGameCount() + 1);
    }

    doBeforeRemoving(...items) {
        super.doAfterComingIntoPlay(...items);
        Lad.setInGameCount(Lad.getInGameCount() - 1);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    };

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const resistDamage = Lad.getInGameCount();
        this.view.signalAbility(() => super.modifyTakenDamage(Math.max(value - resistDamage, 0), fromCard, gameContext, continuation));
    }

    static getBonus() {
        const inGameCount = this.getInGameCount();
        return inGameCount * (inGameCount + 1) / 2;
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature'))
            return ["Чем их больше, тем они сильнее", ...super.getDescriptions()];
        return super.getDescriptions();
    }
}

class Brewer extends Duck {
    constructor() {
        super("Пивовар", 2);
    }

    doBeforeAttack(gameContext, continuation) {
        for (const card of gameContext.currentPlayer.table.concat(gameContext.oppositePlayer.table)) {
            if (isDuck(card)) {
                this.view.signalHeal(() => card);
                card.maxPower += 1;
                card.currentPower = card.currentPower + 2;
                card.updateView();
            }
        }
        super.doBeforeAttack(gameContext, continuation);
    }
}

class PseudoDuck extends Dog {
    constructor() {
        super("Псевдоутка", 3);
    }

    quacks() {}
    swims() {}
}

const seriffStartDeck = [
    new Duck(),
    new Brewer(),
];
const banditStartDeck = [
    new Dog(),
    new PseudoDuck(),
    new Dog(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
