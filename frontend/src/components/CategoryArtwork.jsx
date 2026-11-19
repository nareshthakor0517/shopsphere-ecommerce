const categoryShapes = {
  phone: <><rect x="34" y="12" width="56" height="100" rx="11" fill="#22252d" /><rect x="39" y="19" width="46" height="86" rx="7" fill="url(#screen)" /><circle cx="62" cy="27" r="2" fill="#111" /><circle cx="62" cy="97" r="2" fill="#fff" opacity=".8" /><path d="M47 48c7-12 21-12 31 0-10 15-24 17-31 0Z" fill="#d9e7ff" opacity=".8" /></>,
  laptop: <><path d="m22 34 65-10 12 51-65 9-12-50Z" fill="#22252d" /><path d="m27 37 56-9 9 42-56 8-9-41Z" fill="url(#screen)" /><path d="m16 79 82-12 12 9-83 13-11-10Z" fill="#b9c3d4" /><path d="m35 79 51-8 5 4-50 8-6-4Z" fill="#747e91" /></>,
  headphones: <><path d="M27 67V54a35 35 0 0 1 70 0v13" fill="none" stroke="#262933" strokeWidth="10" strokeLinecap="round" /><rect x="20" y="62" width="23" height="40" rx="9" fill="#20232b" /><rect x="81" y="62" width="23" height="40" rx="9" fill="#20232b" /><rect x="25" y="68" width="13" height="27" rx="6" fill="#596273" /><rect x="86" y="68" width="13" height="27" rx="6" fill="#596273" /></>,
  tablet: <><rect x="20" y="20" width="83" height="79" rx="9" fill="#262833" transform="rotate(-7 20 20)" /><rect x="26" y="25" width="70" height="66" rx="5" fill="url(#screen)" transform="rotate(-7 26 25)" /><path d="M42 70c9-29 31-31 47-5-13 22-31 24-47 5Z" fill="#b9b8ff" opacity=".8" /></>,
  watch: <><path d="M47 19h31l6 25H41l6-25Zm-6 55h43l-6 28H47l-6-28Z" fill="#30333b" /><rect x="34" y="39" width="56" height="40" rx="13" fill="#171921" /><rect x="40" y="44" width="44" height="30" rx="9" fill="url(#screen)" /><path d="M62 50v9l7 4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></>,
  console: <><path d="M34 47c2-10 10-16 20-16h28c11 0 18 7 20 17l8 32c2 11-8 16-15 9L82 76H51L38 89c-8 7-17 1-15-9l11-33Z" fill="#292c36" /><path d="M43 53v16m-8-8h16" stroke="#d8dced" strokeWidth="4" strokeLinecap="round" /><circle cx="83" cy="55" r="3" fill="#7e8cff" /><circle cx="92" cy="65" r="3" fill="#fb709c" /></>,
  camera: <><path d="M22 40h20l8-12h26l8 12h16a8 8 0 0 1 8 8v43a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8Z" fill="#292c36" /><circle cx="63" cy="67" r="22" fill="#11141b" /><circle cx="63" cy="67" r="15" fill="#57627a" /><circle cx="63" cy="67" r="9" fill="#b3c9f8" /><circle cx="91" cy="51" r="4" fill="#f3c35f" /></>,
  audio: <><path d="M35 44c0-15 12-27 27-27s27 12 27 27v18c0 11-8 20-19 20h-8a8 8 0 0 1 0-16h8c2 0 3-2 3-4V44a11 11 0 0 0-22 0v18c0 2 1 4 3 4h3a8 8 0 0 1 0 16h-3c-11 0-19-9-19-20V44Z" fill="#252832" /><path d="M61 91h19" stroke="#838da1" strokeWidth="5" strokeLinecap="round" /></>,
  accessories: <><rect x="25" y="40" width="75" height="51" rx="10" fill="#2a2d37" /><rect x="32" y="47" width="61" height="37" rx="5" fill="#e1e6f4" /><path d="m42 71 14-14 11 11 8-7 12 14H42Z" fill="#7e8db7" /><circle cx="79" cy="57" r="4" fill="#e5b763" /><path d="M50 34v-9h25v9" fill="none" stroke="#444958" strokeWidth="5" strokeLinecap="round" /></>,
};

export default function CategoryArtwork({ kind = 'phone' }) {
  return <svg className="categoryArtwork" viewBox="0 0 120 125" role="img" aria-label={`${kind} illustration`}>
    <defs>
      <linearGradient id="screen" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#829ac6" /><stop offset=".5" stopColor="#19253c" /><stop offset="1" stopColor="#526b96" /></linearGradient>
    </defs>
    <ellipse cx="62" cy="108" rx="48" ry="7" fill="#252338" opacity=".08" />
    {categoryShapes[kind] || categoryShapes.phone}
  </svg>;
}
