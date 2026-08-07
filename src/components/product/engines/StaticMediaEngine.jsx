import SmartImage from '../../common/SmartImage';

export default function StaticMediaEngine({ src, alt, eager = false }) {
  return (
    <SmartImage
      src={src}
      alt={alt}
      width={900}
      height={1125}
      eager={eager}
      className="gw-viewer-image"
      sizes="(min-width: 900px) 50vw, 100vw"
    />
  );
}
