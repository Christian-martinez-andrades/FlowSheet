// my awesome library
import { Flow } from 'vexflow';

export class FlowSheet {
  public mapeado: Map<Flow.Stave, Flow.Voice>;
  public context: Vex.IRenderContext;
  public stave: Flow.Stave;
  public voice: Flow.Voice;
  public notes: Flow.StaveNote[];
  public ligatures: any;
  public isFinal: boolean;
  public secuence: number;
  public limit: number;
  public ligature: any;
  constructor(
    public instrument: any,
    public musicalTime: any,
    public tonality: any,
    public figures: any,
    div: HTMLElement,
    x: number,
    y: number,
    width: number,
    rendererWidth: number,
    rendererHeight: number,
  ) {
    const renderer = new Flow.Renderer(div, Flow.Renderer.Backends.SVG);
    this.ligature = [];
    // Configure the rendering context.
    renderer.resize(1800, 8000);
    this.context = renderer.getContext();
    this.mapeado = new Map<Flow.Stave, Flow.Voice>();
    this.stave = new Flow.Stave(x, y, width);
    this.notes = [];
    this.voice = new Flow.Voice({ num_beats: 0, beat_value: 4 });
    this.isFinal = false;
    this.secuence = 0;
    this.limit = this.musicalTime.numerator * (4 / this.musicalTime.denominator);
  }
  public onAddNote(figure: string, tone: string, high: string, dot: number, puntuacion: number, isNatural: boolean) {
    const valor = this.figures[figure];
    this.context.clear();
    const VF = Flow;
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
    } else if (compascompleto) {
      this.nextStave();
      this.secuence = 0;
      this.notes = [];
    }
    this.drawLigatures();
  }
  public onDelete() {
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
    } else {
      if (this.mapeado.size > 1) {
        this.secuence = this.deleteNotesBeforeStave();
      }
    }
  }
  public onLigature() {
    if (!(this.notes.length === 0)) {
      const note = this.notes[this.notes.length - 1];
      if (!this.ligature.includes(note)) {
        this.ligature.push(note);
      } else {
        this.ligature = [];
      }
    } else {
      if (this.mapeado.size > 1) {
        const long = this.mapeado.size - 1;
        const laststav = Array.from(this.mapeado.keys())[long];
        const voice = this.mapeado.get(laststav);
        const notesTick = voice.getTickables();
        const note = notesTick[notesTick.length - 1];
        if (!this.ligature.includes(note)) {
          this.ligature.push(note);
        } else {
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
  public onFinish(event: Event) {
    this.finish();
    this.isFinal = true;
    this.drawLigatures();
  }

  /*
   * Add two numbers
   * @param number1 First number to add
   * @param number2 Second number to add
   */
  public initSheet() {
    this.stave = this.createFirstStaveSheet();
    this.mapeado.set(this.stave, new Flow.Voice({ num_beats: 0, beat_value: 4 }));
    // Connect it to the rendering context and draw!
    this.stave.setContext(this.context).draw();
  }
  public createFirstStaveSheet() {
    const lon = this.mapeado.size;
    const coun = Math.trunc(lon / 5) * 120;
    this.context.setFont('Arial', 10, 0).setBackgroundFillStyle('#eed');
    // Create a stave of width 400 at position 10, 40 on the canvas.
    this.stave = new Flow.Stave(80, 40 + coun, 360);
    this.stave.setText(this.instrument.name, Flow.Modifier.Position.LEFT);
    // Add a clef, time  adn key signature .
    this.stave.addClef('treble').addTimeSignature(this.musicalTime.numerator + '/' + this.musicalTime.denominator);
    let signature: any;
    if (this.tonality.tone.name) {
      signature = this.tonality.tone.name;
    } else {
      signature = this.tonality.tone;
    }
    this.stave.addKeySignature(signature);
    return this.stave;
  }
  public drawStaves() {
    const keys = this.mapeado.keys();
    for (const stav of keys) {
      stav.setContext(this.context).draw();
      this.voice = this.mapeado.get(stav);
      const formatter = new Flow.Formatter().joinVoices([this.voice]).format([this.voice], 200);
      // Autoformatear las plicas de las corcheas
      const beams = Flow.Beam.generateBeams(this.voice.getTickables() as any);
      this.voice.draw(this.context, stav);
      beams.forEach((beam) => {
        beam.setContext(this.context).draw();
      });
    }
  }
  public nextStave() {
    const staveslenth = this.mapeado.size % 5;
    const lon = this.mapeado.size;
    let position = 410;
    const width = 330;
    if (staveslenth + 1 === 1 || this.mapeado.size === 1) {
      position = 440;
    } else {
      position = 770 + 330 * (staveslenth - 2);
    }
    const coun = Math.trunc(lon / 5) * 120;
    const newstave = new Flow.Stave(position, 40 + coun, width);
    newstave.setContext(this.context).draw();
    this.mapeado.set(newstave, new Flow.Voice({ num_beats: 4, beat_value: 4 }));
  }
  public isStaveComplete() {
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
  public isTooBig(figure: string) {
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
  public deleteNotes() {
    this.notes.splice(this.notes.length - 1);
    this.context.clear();
    this.voice = new Flow.Voice({ num_beats: this.secuence, beat_value: 4 });
    this.voice.addTickables(this.notes);
    const long = this.mapeado.size - 1;
    const laststav = Array.from(this.mapeado.keys())[long];
    this.mapeado.set(laststav, this.voice);
    this.drawStaves();
  }
  public deleteNotesBeforeStave() {
    this.context.clear();
    let long = this.mapeado.size - 1;
    let laststav = Array.from(this.mapeado.keys())[long];
    this.mapeado.delete(laststav);
    long = this.mapeado.size - 1;
    laststav = Array.from(this.mapeado.keys())[long];
    this.voice = this.mapeado.get(laststav);
    const notesTick = this.voice.getTickables();
    const note = notesTick[notesTick.length - 1];
    const figure = (note as any).duration;
    let valor = this.figures[figure];
    if ((note as any).isDotted()) {
      valor = valor + valor / 2;
    }
    const secuence = this.limit - valor;
    this.deleteNotes();
    let sec = 0;
    for (const not of notesTick) {
      const high = (not as any).keyProps[0].octave;
      const tone = (not as any).keyProps[0].key;
      sec = sec + this.figures[figure];
      this.setNotes(figure, tone, high, secuence, 0, 0, false);
    }
    return sec;
  }
  public drawLigature() {
    const Curve = Flow.Curve;
    const curve1 = new Curve(this.ligature[0], this.ligature[1]);

    curve1.setContext(this.context).draw();
  }
  public drawLigatures() {
    for (const ligature of this.ligatures) {
      const Curve = Flow.Curve;
      const curve1 = new Curve(ligature[0], ligature[1]);
      curve1.setContext(this.context).draw();
    }
  }
  public finish() {
    let long = this.mapeado.size - 1;
    let laststav = Array.from(this.mapeado.keys())[long];
    this.mapeado.delete(laststav);
    long = this.mapeado.size - 1;
    laststav = Array.from(this.mapeado.keys())[long];
    const voice = this.mapeado.get(laststav);
    this.mapeado.delete(laststav);
    laststav.setEndBarType(Flow.Barline.type.END);
    this.mapeado.set(laststav, voice);
    this.context.clear();
    this.drawStaves();
  }
  public setNotes(
    figure: string,
    tone: string,
    high: string,
    secuence: number,
    puntuacion: number,
    dot: number,
    natural: boolean,
  ) {
    let note: any;
    let pos = 4;
    // Si es silencio
    if (puntuacion === 1) {
      figure = figure + 'r';
      tone = 'B';
      high = '4';
    }
    // Comprobación para colocar la plica
    if (+high >= 5 || (tone.includes('B') && +high === 4)) {
      note = new Flow.StaveNote({
        clef: 'treble',
        keys: [tone + '/' + high],
        duration: figure,
        stem_direction: -1,
        dots: dot,
      });
      pos = 3;
    } else {
      note = new Flow.StaveNote({ clef: 'treble', keys: [tone + '/' + high], duration: figure, dots: dot });
    }
    // Para escribir puntillo
    if (note.dots >= 1) {
      note.addDotToAll();
    }
    // Si hay q añadir stacatto
    if (puntuacion === 2) {
      note.addArticulation(0, new Flow.Articulation('a.').setPosition(pos));
      // Si hay q añadir acento
    } else if (puntuacion === 3) {
      note.addArticulation(0, new Flow.Articulation('a>').setPosition(pos));
      // Si hay q añadir subrayado
    } else if (puntuacion === 4) {
      note.addArticulation(0, new Flow.Articulation('a-').setPosition(pos));
      // SI hay q añadir calderón
    } else if (puntuacion === 5) {
      note.addArticulation(0, new Flow.Articulation('a@a').setPosition(3));
    }
    // Añadir becuadro
    if (natural) {
      // Añadir alteraciones
      note.addAccidental(0, new Flow.Accidental('n'));
    } else {
      if (tone.includes('#')) {
        note.addAccidental(0, new Flow.Accidental('#'));
      } else if (tone.includes('b')) {
        note.addAccidental(0, new Flow.Accidental('b'));
      }
    }
    this.voice = new Flow.Voice({ num_beats: secuence, beat_value: 4 });
    this.notes.push(note);
    this.voice.addTickables(this.notes);
    const long = this.mapeado.size - 1;
    const laststav = Array.from(this.mapeado.keys())[long];
    this.mapeado.set(laststav, this.voice);
  }
}
