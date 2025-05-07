AFRAME.registerComponent('scene-manager', {
  schema: {
    data: { type: 'string' }
  },

  init: function() {
    // Deep linking: check for ?link=SCENEID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const linkScene = urlParams.get('link');
    this.currentSceneId = 0;
    if (linkScene !== null && !isNaN(Number(linkScene))) {
      this.currentSceneId = parseInt(linkScene, 10);
    }
    this.sceneData = null;
    this.isTransitioning = false;
    this.hotspotContainer = document.createElement('a-entity');
    this.hotspotContainer.setAttribute('id', 'hotspot-container');
    this.el.appendChild(this.hotspotContainer);
    
    // Initialize quiz tracking
    this.quizStats = {
      totalQuestions: 0,
      correctAnswers: 0,
      quizDetails: [] // Will store details of each quiz attempt
    };
    
    // Splash shown flag
    this.splashShownOnce = false;
    
    this.loadData();
    this.setupEventListeners();
    this.popupContainer = document.querySelector("#popup-container");
    console.log("=========================\n"+this.popupContainer.outerHTML);
  },

  setupEventListeners: function() {
    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
      if (this.isTransitioning) return;
      
      if (event.key === 'ArrowLeft') {
        this.currentSceneId = (this.currentSceneId - 1 + this.sceneData.scenes.length) % this.sceneData.scenes.length;
        this.updateScene();
      } else if (event.key === 'ArrowRight') {
        this.currentSceneId = (this.currentSceneId + 1) % this.sceneData.scenes.length;
        this.updateScene();
      }
    });

    // Navigation hotspot events
    this.el.sceneEl.addEventListener('navigateToScene', (event) => {
      console.log('Navigation event received:', event.detail);
      if (this.isTransitioning) return;
      
      const targetSceneId = event.detail.sceneId;
      if (targetSceneId === -1) {
        // Show summary popup
        this.showSummaryPopup();
        return;
      }
      
      if (typeof targetSceneId === 'number' && targetSceneId >= 0 && targetSceneId < this.sceneData.scenes.length) {
        console.log('Navigating to scene:', targetSceneId);
        this.currentSceneId = targetSceneId;
        this.updateScene();
      } else {
        console.warn('Invalid scene ID:', targetSceneId);
      }
    });

    // Quiz completion tracking
    this.el.sceneEl.addEventListener('quizCompleted', (event) => {
      const hotspotId = event.detail.hotspotId;
      const isCorrect = event.detail.isCorrect;
      const quizDetails = event.detail.quizDetails;
      
      // Update quiz stats
      this.quizStats.totalQuestions++;
      if (isCorrect) {
        this.quizStats.correctAnswers++;
      }
      
      // Store quiz attempt details
      this.quizStats.quizDetails.push({
        hotspotId,
        isCorrect,
        question: quizDetails.quizQuestion,
        sceneId: this.currentSceneId,
        sceneName: this.sceneData.scenes[this.currentSceneId].name
      });
      
      console.log('Updated quiz stats:', this.quizStats);
    });
  },

  loadData: function() {
    fetch(this.data.data)
      .then(response => response.json())
      .then(data => {
        console.log('Loaded scene data:', data);
        this.sceneData = data;
        // Deep linking: re-parse ?link= param after data is loaded
        const urlParams = new URLSearchParams(window.location.search);
        const linkScene = urlParams.get('link');
        if (linkScene !== null && !isNaN(Number(linkScene))) {
          const idx = parseInt(linkScene, 10);
          if (idx >= 0 && idx < this.sceneData.scenes.length) {
            this.currentSceneId = idx;
          } else {
            this.currentSceneId = 0;
          }
        } else {
          this.currentSceneId = 0;
        }
        console.log('Loaded scene data again:', this.sceneData);
        this.updateScene();
        // Only show splash if not already shown
        if (!this.splashShownOnce) {
          this.loadSplash(this.sceneData);
        }
        // Apply starting orientation for initial scene
        const scene = this.sceneData.scenes[this.currentSceneId];
        if (scene && scene.startingOrientation) {
          const orientation = scene.startingOrientation.split(' ').map(Number);
          const camera = document.querySelector('[camera], a-camera');
          if (camera) {
            camera.setAttribute('rotation', `${orientation[0]} ${orientation[1]} ${orientation[2]}`);
            if (camera.components['look-controls']) {
              const [x, y, z] = orientation.map(val => THREE.MathUtils.degToRad(val));
              camera.components['look-controls'].pitchObject.rotation.x = x;
              camera.components['look-controls'].yawObject.rotation.y = y;
            }
          }
        }
      })
      .catch(error => console.error('Error loading scene data:', error));
  },

  loadSplash: function() {
    
    let splashName =this.sceneData.global.name;
    let splashDescription = this.sceneData.global.description;
    let splashFooter = this.sceneData.global.footer;

    let splashPopupData=`
        <article>
          <div class="grid-container">
            <div class="header"></div>
            <div class="content"> 
              <h3>${splashName}</h3>
              ${splashDescription}
            </div>
            <div class="footer">
              ${splashFooter}
              <button id="splash-close" class="popup-btn-close secondary" onClick="">Begin</button>
            </div>
          </div>
        </article>`;
      console.log("splash>>\n"+splashPopupData);
      // Create splash dialog
      const splashPopup = document.createElement('dialog');
      splashPopup.setAttribute('id', 'splash');
      splashPopup.setAttribute('class', 'splash');
      splashPopup.setAttribute('open', '');

      splashPopup.insertAdjacentHTML("afterbegin", splashPopupData);
      this.popupContainer.appendChild(splashPopup);  
      //popup close buttons
      this.popupContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('popup-btn-close')) {
          event.target.closest("dialog").removeAttribute('open');
          // Set splashShownOnce to true when splash is closed
          this.splashShownOnce = true;
        }
      });
  },

  showSummaryPopup: function() {
    const score = Math.round((this.quizStats.correctAnswers / this.quizStats.totalQuestions) * 100);
    
    let summaryHTML = `
      <article>
        <header>
          <button class="popup-btn-close" aria-label="Close" rel="prev"></button>
          <h4>Experience Summary</h4>
        </header>
        <div class="content-container">
          <h3>Quiz Results</h3>
          <p>You answered ${this.quizStats.correctAnswers} out of ${this.quizStats.totalQuestions} questions correctly.</p>
          <p>Final Score: ${score}%</p>
          <button id="restart-experience" class="secondary">Restart</button>
          <h3>Question Details</h3>
          <div class="quiz-details">`;
    
    this.quizStats.quizDetails.forEach((detail, index) => {
      summaryHTML += `
        <div class="quiz-item">
          <p><strong>Scene:</strong> ${detail.sceneName}</p>
          <p><strong>Question:</strong> ${detail.question}</p>
          <p><strong>Result:</strong> ${detail.isCorrect ? 'Correct' : 'Incorrect'}</p>
        </div>`;
    });
    
    summaryHTML += `
          </div>
        </div>
        <footer>
          <button class="popup-btn-close secondary">Close</button>
        </footer>
      </article>`;
    
    // Create and show summary dialog
    const summaryPopup = document.createElement('dialog');
    summaryPopup.setAttribute('id', 'summary-popup');
    summaryPopup.setAttribute('class', 'popup');
    summaryPopup.setAttribute('open', '');
    
    summaryPopup.insertAdjacentHTML('afterbegin', summaryHTML);
    this.popupContainer.appendChild(summaryPopup);
    
    // Add close button handler
    summaryPopup.querySelectorAll('.popup-btn-close').forEach(btn => {
      btn.addEventListener('click', () => {
        summaryPopup.removeAttribute('open');
        setTimeout(() => summaryPopup.remove(), 500);
      });
    });
    // Add restart button handler
    const restartBtn = summaryPopup.querySelector('#restart-experience');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        summaryPopup.removeAttribute('open');
        setTimeout(() => summaryPopup.remove(), 500);
        this.restartExperience();
      });
    }
  },

  restartExperience: function() {
    // Reset quiz stats
    this.quizStats = {
      totalQuestions: 0,
      correctAnswers: 0,
      quizDetails: []
    };
    // Set splashShownOnce to true so splash does not show again
    this.splashShownOnce = true;
    // Go back to scene 0
    this.currentSceneId = 0;
    this.updateScene();
  },

  updateScene: function() {
    const scene = this.sceneData.scenes[this.currentSceneId];
    if (!scene) {
      console.error('No scene found for ID:', this.currentSceneId);
      return;
    }

    console.log('Updating to scene:', scene.name);
    this.isTransitioning = true;

    // Get current sky
    const currentSky = document.querySelector('#sky');
    const currentSrc = currentSky.getAttribute('src');

    // Create transition sky
    const transitionSky = document.createElement('a-sky');
    transitionSky.setAttribute('id', 'transition-sky');
    transitionSky.setAttribute('src', currentSrc);
    transitionSky.setAttribute('material', 'opacity: 1; transparent: true');
    this.el.sceneEl.appendChild(transitionSky);

    // Update main sky with new image
    currentSky.setAttribute('src', scene.image);
    // Always keep skybox rotation at 0 0 0
    currentSky.setAttribute('rotation', '0 0 0');
    
    // Apply starting orientation to camera
    const orientation = scene.startingOrientation.split(' ').map(Number);
    console.log("camera 0>>\n"+orientation);
    const camera = document.querySelector('[camera], a-camera');
    let rot = camera.getAttribute('rotation');
    console.log("camera 1>>\n:", rot.x, rot.y, rot.z);
    if (camera) {
      // Set A-Frame attribute for consistency
      camera.setAttribute('rotation', `${orientation[0]} ${orientation[1]} ${orientation[2]}`);
      // Set look-controls internal rotation
      if (camera.components['look-controls']) {
        const [x, y, z] = orientation.map(THREE.MathUtils.degToRad);
        camera.components['look-controls'].pitchObject.rotation.x = x;
        camera.components['look-controls'].yawObject.rotation.y = y;
      }
      rot = camera.getAttribute('rotation');
      console.log("camera 2>>\n:", rot.x, rot.y, rot.z);
    }

    // Clear existing hotspots
    while (this.hotspotContainer.firstChild) {
      this.hotspotContainer.removeChild(this.hotspotContainer.firstChild);
    }

    // Create new hotspots
    console.log('Creating hotspots for scene:', scene.hotspots);
    scene.hotspots.forEach(hotspotData => {
      console.log('Creating hotspot:', hotspotData);
      const hotspot = document.createElement('a-entity');
      hotspot.setAttribute('position', hotspotData.position);
      hotspot.setAttribute('hotspot-id', hotspotData.id);
      
      // Ensure specific data is properly structured
      const specific = {
        targetSrc: hotspotData.specific.targetSrc,
        targetDesc: hotspotData.specific.targetDesc,
        triggerHotspot: !!hotspotData.specific.triggerHotspot,
        triggerSrc: hotspotData.specific.triggerSrc
      };

      // Add questionDetails for quiz type
      if (hotspotData.type === 'quiz') {
        console.log('Processing quiz hotspot:', hotspotData.id);
        console.log('Raw questionDetails:', hotspotData.specific.questionDetails);
        if (hotspotData.specific.questionDetails) {
          specific.questionDetails = hotspotData.specific.questionDetails;
          console.log('Added questionDetails to specific:', specific.questionDetails);
        } else {
          console.warn('No questionDetails found for quiz hotspot:', hotspotData.id);
        }
      }

      console.log('Final specific data being set:', specific);
      hotspot.setAttribute('hotspot', {
        id: hotspotData.id,
        type: hotspotData.type,
        label: hotspotData.label,
        useRotation: hotspotData.useRotation,
        rotation: hotspotData.rotation,
        visited: hotspotData.visited,
        specific: JSON.stringify(specific)
      });

      this.hotspotContainer.appendChild(hotspot);
    });

    // Fade out transition sky
    let opacity = 1;
    const fadeOut = setInterval(() => {
      opacity -= 0.1;
      if (opacity <= 0) {
        clearInterval(fadeOut);
        this.el.sceneEl.removeChild(transitionSky);
        this.isTransitioning = false;
        // Emit scene change event
        this.el.sceneEl.emit('sceneChanged');
      } else {
        transitionSky.setAttribute('material', `opacity: ${opacity}; transparent: true`);
      }
    }, 50);

  //   // Create or update scene name text
  //   let nameText = document.querySelector('#scene-name');
  //   if (!nameText) {
  //     nameText = document.createElement('a-text');
  //     nameText.setAttribute('id', 'scene-name');
  //     nameText.setAttribute('position', '0 -0.25 -2');
  //     nameText.setAttribute('align', 'center');
  //     nameText.setAttribute('width', '4');
  //     nameText.setAttribute('color', '#FFFFFF');
  //     this.el.sceneEl.appendChild(nameText);
  //   }
  //   nameText.setAttribute('value', scene.name + " " + this.currentSceneId);

  //   // Create or update description text
  //   let descText = document.querySelector('#scene-description');
  //   if (!descText) {
  //     descText = document.createElement('a-text');
  //     descText.setAttribute('id', 'scene-description');
  //     descText.setAttribute('position', '0 -0.5 -2');
  //     descText.setAttribute('align', 'center');
  //     descText.setAttribute('width', '4');
  //     descText.setAttribute('color', '#FFFFFF');
  //     this.el.sceneEl.appendChild(descText);
  //   }
  //   descText.setAttribute('value', scene.description);
   }
}); 