document.addEventListener("DOMContentLoaded", function() {
  const carousels = document.querySelectorAll('.carousel');

  carousels.forEach(carousel => {
    const images = carousel.querySelectorAll('.carousel-image');
    let currentIndex = 0;

    function showNextImage() {
      images[currentIndex].classList.remove('active');
      currentIndex = (currentIndex + 1) % images.length;
      images[currentIndex].classList.add('active');
    }

    // Add click event listener to each image
    images.forEach(img => {
      img.addEventListener('click', showNextImage);
    });
  });
});
