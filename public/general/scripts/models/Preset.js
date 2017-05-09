export default class Preset {
  constructor(image, music, scaleKey, colorTones){
    this.image = image;
    this.music = music;
    this.scaleKey = scaleKey;
    this.colorTones = {};
    for (let color in colorTones){
      // this obj should have color keys corresponding to chordKeys
      // will be considered more primary by entry order
      this.colorTones[color] = colorTones[color];
    }
  }
}
