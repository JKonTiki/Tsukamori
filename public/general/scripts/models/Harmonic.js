export default class Harmonic {
  constructor(audioContext, fundFreq, number, gainRatio, instrumentGain){
    this.frequency = fundFreq * number;
    this.gainRatio = gainRatio;
    this.gain = audioContext.createGain();
    // reduce gain above a certain frequency, kind of like our own custom filter
    let gain = gainRatio;
    let cutoff = 1500.0;
    if (this.frequency > cutoff) {
      let difference = Math.ceil((this.frequency - cutoff) / 500.0);
      gain *= (1/difference);
    }
    this.gain.gain.value = gain;
    this.oscillator = audioContext.createOscillator();
    this.oscillator.type = 'triangle';
    this.oscillator.frequency.value = this.frequency;
    this.oscillator.connect(this.gain);
    this.gain.connect(instrumentGain);
  }
}
