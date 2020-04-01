"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// my awesome library
const vexflow_1 = require("vexflow");
class FlowSheet {
    constructor(instrument, musicalTime, tonality, figures, div, x, y, width, rendererWidth, rendererHeight) {
        this.instrument = instrument;
        this.musicalTime = musicalTime;
        this.tonality = tonality;
        this.figures = figures;
        const renderer = new vexflow_1.Flow.Renderer(div, 3 /* SVG */);
        this.ligature = [];
        // Configure the rendering context.
        renderer.resize(1800, 8000);
        this.context = renderer.getContext();
        this.mapeado = new Map();
        this.stave = new vexflow_1.Flow.Stave(x, y, width);
        this.notes = [];
        this.voice = new vexflow_1.Flow.Voice({ num_beats: 0, beat_value: 4 });
        this.isFinal = false;
        this.secuence = 0;
        this.limit = this.musicalTime.numerator * (4 / this.musicalTime.denominator);
    }
    onAddNote(figure, tone, high, dot, puntuacion, isNatural) {
        const valor = this.figures[figure];
        this.context.clear();
        const VF = vexflow_1.Flow;
        const tooBig = this.isTooBig(figure);
        if (!tooBig) {
            this.secuence = this.secuence + valor + (dot * valor) / 2;
            this.setNotes(figure, tone, high, this.secuence, puntuacion, dot, isNatural);
        }
        this.drawStaves();
        const lon = this.mapeado.size;
        const pentagramacompleto = lon % 5 === 0;
        const compascompleto = this.isStaveComplete();
        if (compascompleto && pentagramacompleto) {
            this.initSheet();
            this.secuence = 0;
            this.notes = [];
        }
        else if (compascompleto) {
            this.nextStave();
            this.secuence = 0;
            this.notes = [];
        }
        this.drawLigatures();
    }
    onDelete() {
        if (!(this.notes.length === 0)) {
            const note = this.notes[this.notes.length - 1];
            const figure = note.getDuration();
            let valor = this.figures[figure];
            if (note.isDotted()) {
                valor = valor + valor / 2;
            }
            this.secuence = this.secuence - valor;
            this.deleteNotes();
            if (this.secuence < 0) {
                this.secuence = 0;
            }
        }
        else {
            if (this.mapeado.size > 1) {
                this.secuence = this.deleteNotesBeforeStave();
            }
        }
    }
    onLigature() {
        if (!(this.notes.length === 0)) {
            const note = this.notes[this.notes.length - 1];
            if (!this.ligature.includes(note)) {
                this.ligature.push(note);
            }
            else {
                this.ligature = [];
            }
        }
        else {
            if (this.mapeado.size > 1) {
                const long = this.mapeado.size - 1;
                const laststav = Array.from(this.mapeado.keys())[long];
                const voice = this.mapeado.get(laststav);
                const notesTick = voice.getTickables();
                const note = notesTick[notesTick.length - 1];
                if (!this.ligature.includes(note)) {
                    this.ligature.push(note);
                }
                else {
                    this.ligature = [];
                }
            }
        }
        if (this.ligature.length === 2) {
            this.drawLigature();
            this.ligatures.push(this.ligature);
            this.ligature = [];
        }
    }
    onFinish(event) {
        this.finish();
        this.isFinal = true;
        this.drawLigatures();
    }
    /*
     * Add two numbers
     * @param number1 First number to add
     * @param number2 Second number to add
     */
    initSheet() {
        this.stave = this.createFirstStaveSheet();
        this.mapeado.set(this.stave, new vexflow_1.Flow.Voice({ num_beats: 0, beat_value: 4 }));
        // Connect it to the rendering context and draw!
        this.stave.setContext(this.context).draw();
    }
    createFirstStaveSheet() {
        const lon = this.mapeado.size;
        const coun = Math.trunc(lon / 5) * 120;
        this.context.setFont('Arial', 10, 0).setBackgroundFillStyle('#eed');
        // Create a stave of width 400 at position 10, 40 on the canvas.
        this.stave = new vexflow_1.Flow.Stave(80, 40 + coun, 360);
        this.stave.setText(this.instrument.name, 1 /* LEFT */);
        // Add a clef, time  adn key signature .
        this.stave.addClef('treble').addTimeSignature(this.musicalTime.numerator + '/' + this.musicalTime.denominator);
        let signature;
        if (this.tonality.tone.name) {
            signature = this.tonality.tone.name;
        }
        else {
            signature = this.tonality.tone;
        }
        this.stave.addKeySignature(signature);
        return this.stave;
    }
    drawStaves() {
        const keys = this.mapeado.keys();
        for (const stav of keys) {
            stav.setContext(this.context).draw();
            this.voice = this.mapeado.get(stav);
            const formatter = new vexflow_1.Flow.Formatter().joinVoices([this.voice]).format([this.voice], 200);
            // Autoformatear las plicas de las corcheas
            const beams = vexflow_1.Flow.Beam.generateBeams(this.voice.getTickables());
            this.voice.draw(this.context, stav);
            beams.forEach((beam) => {
                beam.setContext(this.context).draw();
            });
        }
    }
    nextStave() {
        const staveslenth = this.mapeado.size % 5;
        const lon = this.mapeado.size;
        let position = 410;
        const width = 330;
        if (staveslenth + 1 === 1 || this.mapeado.size === 1) {
            position = 440;
        }
        else {
            position = 770 + 330 * (staveslenth - 2);
        }
        const coun = Math.trunc(lon / 5) * 120;
        const newstave = new vexflow_1.Flow.Stave(position, 40 + coun, width);
        newstave.setContext(this.context).draw();
        this.mapeado.set(newstave, new vexflow_1.Flow.Voice({ num_beats: 4, beat_value: 4 }));
    }
    isStaveComplete() {
        let totalduration = 0;
        for (const note of this.notes) {
            const fig = note.getDuration();
            let duration = this.figures[fig];
            if (note.isDotted()) {
                duration = duration + duration / 2;
            }
            totalduration = totalduration + duration;
        }
        const b = this.limit === totalduration;
        return b;
    }
    isTooBig(figure) {
        let totalduration = this.figures[figure];
        for (const note of this.notes) {
            const fig = note.getDuration();
            let duration = this.figures[fig];
            if (note.isDotted()) {
                duration = duration + duration / 2;
            }
            totalduration = totalduration + duration;
        }
        const b = totalduration > this.limit;
        return b;
    }
    deleteNotes() {
        this.notes.splice(this.notes.length - 1);
        this.context.clear();
        this.voice = new vexflow_1.Flow.Voice({ num_beats: this.secuence, beat_value: 4 });
        this.voice.addTickables(this.notes);
        const long = this.mapeado.size - 1;
        const laststav = Array.from(this.mapeado.keys())[long];
        this.mapeado.set(laststav, this.voice);
        this.drawStaves();
    }
    deleteNotesBeforeStave() {
        this.context.clear();
        let long = this.mapeado.size - 1;
        let laststav = Array.from(this.mapeado.keys())[long];
        this.mapeado.delete(laststav);
        long = this.mapeado.size - 1;
        laststav = Array.from(this.mapeado.keys())[long];
        this.voice = this.mapeado.get(laststav);
        const notesTick = this.voice.getTickables();
        const note = notesTick[notesTick.length - 1];
        const figure = note.duration;
        let valor = this.figures[figure];
        if (note.isDotted()) {
            valor = valor + valor / 2;
        }
        const secuence = this.limit - valor;
        this.deleteNotes();
        let sec = 0;
        for (const not of notesTick) {
            const high = not.keyProps[0].octave;
            const tone = not.keyProps[0].key;
            sec = sec + this.figures[figure];
            this.setNotes(figure, tone, high, secuence, 0, 0, false);
        }
        return sec;
    }
    drawLigature() {
        const Curve = vexflow_1.Flow.Curve;
        const curve1 = new Curve(this.ligature[0], this.ligature[1]);
        curve1.setContext(this.context).draw();
    }
    drawLigatures() {
        for (const ligature of this.ligatures) {
            const Curve = vexflow_1.Flow.Curve;
            const curve1 = new Curve(ligature[0], ligature[1]);
            curve1.setContext(this.context).draw();
        }
    }
    finish() {
        let long = this.mapeado.size - 1;
        let laststav = Array.from(this.mapeado.keys())[long];
        this.mapeado.delete(laststav);
        long = this.mapeado.size - 1;
        laststav = Array.from(this.mapeado.keys())[long];
        const voice = this.mapeado.get(laststav);
        this.mapeado.delete(laststav);
        laststav.setEndBarType(3 /* END */);
        this.mapeado.set(laststav, voice);
        this.context.clear();
        this.drawStaves();
    }
    setNotes(figure, tone, high, secuence, puntuacion, dot, natural) {
        let note;
        let pos = 4;
        // Si es silencio
        if (puntuacion === 1) {
            figure = figure + 'r';
            tone = 'B';
            high = '4';
        }
        // Comprobación para colocar la plica
        if (+high >= 5 || (tone.includes('B') && +high === 4)) {
            note = new vexflow_1.Flow.StaveNote({
                clef: 'treble',
                keys: [tone + '/' + high],
                duration: figure,
                stem_direction: -1,
                dots: dot,
            });
            pos = 3;
        }
        else {
            note = new vexflow_1.Flow.StaveNote({ clef: 'treble', keys: [tone + '/' + high], duration: figure, dots: dot });
        }
        // Para escribir puntillo
        if (note.dots >= 1) {
            note.addDotToAll();
        }
        // Si hay q añadir stacatto
        if (puntuacion === 2) {
            note.addArticulation(0, new vexflow_1.Flow.Articulation('a.').setPosition(pos));
            // Si hay q añadir acento
        }
        else if (puntuacion === 3) {
            note.addArticulation(0, new vexflow_1.Flow.Articulation('a>').setPosition(pos));
            // Si hay q añadir subrayado
        }
        else if (puntuacion === 4) {
            note.addArticulation(0, new vexflow_1.Flow.Articulation('a-').setPosition(pos));
            // SI hay q añadir calderón
        }
        else if (puntuacion === 5) {
            note.addArticulation(0, new vexflow_1.Flow.Articulation('a@a').setPosition(3));
        }
        // Añadir becuadro
        if (natural) {
            // Añadir alteraciones
            note.addAccidental(0, new vexflow_1.Flow.Accidental('n'));
        }
        else {
            if (tone.includes('#')) {
                note.addAccidental(0, new vexflow_1.Flow.Accidental('#'));
            }
            else if (tone.includes('b')) {
                note.addAccidental(0, new vexflow_1.Flow.Accidental('b'));
            }
        }
        this.voice = new vexflow_1.Flow.Voice({ num_beats: secuence, beat_value: 4 });
        this.notes.push(note);
        this.voice.addTickables(this.notes);
        const long = this.mapeado.size - 1;
        const laststav = Array.from(this.mapeado.keys())[long];
        this.mapeado.set(laststav, this.voice);
    }
}
exports.FlowSheet = FlowSheet;
//# sourceMappingURL=FlowSheet.js.map