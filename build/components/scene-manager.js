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
      if (typeof targetSceneId === 'number' && targetSceneId >= 0 && targetSceneId < this.sceneData.scenes.length) {
        console.log('Navigating to scene:', targetSceneId);
        this.currentSceneId = targetSceneId;
        this.updateScene();
      } else {
        console.warn('Invalid scene ID:', targetSceneId);
      }
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
        this.loadSplash(this.sceneData);
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
        }
      });
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