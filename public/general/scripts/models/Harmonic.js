export default class Harmonic {
  constructor(audioContext, fundFreq, number, gainRatio, instrumentGain, type, cutoff){
    this.frequency = fundFreq * number;
    this.gain = audioContext.createGain();
    // reduce gain above a certain frequency, kind of like our own custom filter
    let gain = gainRatio;
    if (cutoff && this.frequency > cutoff) {
      let difference = Math.ceil((this.frequency - cutoff) / 50.0);
      gain *= (1/difference);
    }
    this.gainRatio = gain;
    this.gain.gain.value = gain;
    this.oscillator = audioContext.createOscillator();
    this.oscillator.type = type;
    this.oscillator.frequency.value = this.frequency;
    this.oscillator.connect(this.gain);
    this.gain.connect(instrumentGain);
  }
}
