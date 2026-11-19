import CategoryArtwork from './CategoryArtwork';
import { resolveImageUrl } from '../imageUrl';
import { useEffect, useState } from 'react';

const slides = [
  { eyebrow: 'YOUR EVERYDAY TECH, UPGRADED', first: 'Tech that', accent: 'powers', last: 'your life', text: 'Discover the latest electronics, smart devices and accessories at prices you’ll love.', kind: 'laptop' },
  { eyebrow: 'BUILT FOR YOUR BUSIEST DAYS', first: 'Work smarter,', accent: 'wherever', last: 'life takes you', text: 'Reliable essentials for your desk, your commute and everywhere in between.', kind: 'phone' },
  { eyebrow: 'MAKE ROOM FOR BETTER SOUND', first: 'Find your', accent: 'own rhythm', last: '', text: 'Explore headphones and audio essentials made for your everyday soundtrack.', kind: 'headphones' },
  { eyebrow: 'SMALL UPGRADES. BIG DIFFERENCE.', first: 'Good tech,', accent: 'better', last: 'everyday', text: 'Meet useful accessories and smart devices that make daily routines easier.', kind: 'watch' },
];

export default function HeroSection({ products, onExplore }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];
  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide(index => (index + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);
  const matchTerms = { laptop: ['laptop', 'computer'], phone: ['mobile', 'phone', 'smartphone'], headphones: ['audio', 'headphone', 'earphone', 'speaker'], watch: ['watch'] }[slide.kind];
  const matchingProduct = products.find(product => matchTerms.some(term => `${product.name} ${product.category}`.toLowerCase().includes(term)));
  const featuredProduct = matchingProduct || products[activeSlide % Math.max(products.length, 1)];
  return <>
  <section className="homeHero">
    <div className="heroCopy">
      <span className="heroEyebrow">{slide.eyebrow}</span>
      <h1>{slide.first}<br /><span className="heroLine"><em>{slide.accent}</em>{slide.last ? ` ${slide.last}` : ''}</span></h1>
      <p>{slide.text}</p>
      <button className="primary heroButton" onClick={onExplore}>SHOP NOW <span>→</span></button>
    </div>
    <div className="heroShowcase">
      <div className="heroBackdrop" />
      {featuredProduct?.image_url ? <div className="heroProductFrame"><img className="heroSlidePhoto" src={resolveImageUrl(featuredProduct.image_url)} alt={featuredProduct.name} /></div>
        : <div className="heroArtworkCard"><span className="artworkSparkle">✦</span><CategoryArtwork kind={slide.kind} /><small>SHOPSPHERE EDIT</small></div>}
      <div className="heroMiniCard heroMiniCardOne"><CategoryArtwork kind="watch" /></div>
      <div className="heroMiniCard heroMiniCardTwo"><CategoryArtwork kind="headphones" /></div>
      <div className="heroDots" aria-label="Featured slides">{slides.map((item, index) => <button key={item.eyebrow} className={index === activeSlide ? 'selected' : ''}
        aria-label={`Show slide ${index + 1}: ${item.eyebrow.toLowerCase()}`} aria-pressed={index === activeSlide} onClick={() => setActiveSlide(index)} />)}</div>
    </div>
  </section>
  <div className="trustStrip">
    <div><span>◇</span><b>100% genuine products</b></div><i />
    <div><span>♧</span><b>Official warranty</b></div><i />
    <div><span>⇄</span><b>Easy returns</b></div><i />
    <div><span>♙</span><b>Secure checkout</b></div>
  </div>
  </>;
}
