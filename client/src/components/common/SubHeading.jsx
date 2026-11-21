export default function SubHeading({ title, className = '', isBanner = false }) {
  return (
    <div>
      <div className={`sub-heading ${isBanner ? 'sub-heading-banner' : ''} ${className}`}>
        {!isBanner && <i className="fa-solid fa-circle accent-color-2"></i>}
        <span className="sub-heading-title">{title}</span>
      </div>
    </div>
  );
}
