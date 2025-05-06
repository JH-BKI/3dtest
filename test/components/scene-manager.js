AFRAME.registerComponent('scene-manager', {
  schema: {
    data: { type: 'string' }
  },

  init: function() {
    this.currentSceneId = 0;
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
        console.log('Loaded scene data again:', this.sceneData);
        this.updateScene();
        this.loadSplash(this.sceneData);
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
    
    // Apply starting orientation
    const orientation = scene.startingOrientation.split(' ').map(Number);
    currentSky.setAttribute('rotation', `${orientation[0]} ${orientation[1]} ${orientation[2]}`);

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

    // Create or update scene name text
    let nameText = document.querySelector('#scene-name');
    if (!nameText) {
      nameText = document.createElement('a-text');
      nameText.setAttribute('id', 'scene-name');
      nameText.setAttribute('position', '2 3 -2');
      nameText.setAttribute('align', 'center');
      nameText.setAttribute('width', '4');
      nameText.setAttribute('color', '#FFFFFF');
      this.el.sceneEl.appendChild(nameText);
    }
    nameText.setAttribute('value', scene.name + " " + this.currentSceneId);

    // Create or update description text
    let descText = document.querySelector('#scene-description');
    if (!descText) {
      descText = document.createElement('a-text');
      descText.setAttribute('id', 'scene-description');
      descText.setAttribute('position', '2 3 -2');
      descText.setAttribute('align', 'center');
      descText.setAttribute('width', '4');
      descText.setAttribute('color', '#FFFFFF');
      this.el.sceneEl.appendChild(descText);
    }
    descText.setAttribute('value', scene.description);
  }
}); 