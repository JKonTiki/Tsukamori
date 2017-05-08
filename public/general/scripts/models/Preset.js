export default class Preset {
  constructor(image, music, colorChords){
    this.image = image;
    this.music = music;
    this.colorChords = {};
    for (let color in colorChords){
      // this obj should have color keys corresponding to chordKeys
      // will be considered more primary by entry order
      this.colorChords[color] = colorChords[color];
    }
  }
}
