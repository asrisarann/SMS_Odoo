export default function VideoModal({ isOpen, videoUrl, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      id="modal-overlay"
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target.id === 'modal-overlay') onClose();
      }}
    >
      <span className="my-close" onClick={onClose} role="button" aria-label="Close modal">
        <i className="fa-solid fa-xmark"></i>
      </span>
      <div className="my-modal">
        <iframe
          id="my-video-frame"
          src={`${videoUrl || 'https://www.youtube.com/embed/VhBl3dHT5SY'}?autoplay=1`}
          title="Video player"
          allow="autoplay; encrypted-media"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
