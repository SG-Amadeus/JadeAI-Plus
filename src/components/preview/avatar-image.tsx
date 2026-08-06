interface AvatarImageProps {
  src: string;
  avatarStyle?: 'circle' | 'oneInch';
  size: number;
  className?: string;
  style?: React.CSSProperties;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

export function AvatarImage({
  src,
  avatarStyle = 'oneInch',
  size,
  className = '',
  style,
  wrapperClassName,
  wrapperStyle,
}: AvatarImageProps) {
  const isCircle = avatarStyle !== 'oneInch';
  const width = isCircle ? size : Math.max(size, 96);
  const height = isCircle ? width : Math.round(width * 1.4);
  const borderRadius = isCircle ? '9999px' : '4px';
  const fit = isCircle ? 'cover' : 'contain';

  const imgEl = (
    <img
      src={src}
      alt=""
      className={className}
      style={{
        width,
        height,
        borderRadius,
        objectFit: fit,
        backgroundColor: isCircle ? undefined : '#f1f1f1',
        ...style,
      }}
    />
  );

  if (wrapperClassName || wrapperStyle) {
    return (
      <div
        className={wrapperClassName}
        style={{ borderRadius, ...wrapperStyle }}
      >
        {imgEl}
      </div>
    );
  }

  return imgEl;
}
