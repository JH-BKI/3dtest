AFRAME.registerComponent('hotspot', {
  schema: {
    id: { type: 'number' },
    type: { type: 'string' },
    label: { type: 'string' },
    useRotation: { type: 'boolean' },
    rotation: { type: 'string' },
    visited: { type: 'boolean' },
    specific: { type: 'string' } // Keep as string, we'll parse it in init
  },

  init: function() {
    // Parse specific data
    try {
      console.log('Raw specific data for hotspot:', this.data.specific);
      this.specificData = typeof this.data.specific === 'string' ? 
        JSON.parse(this.data.specific) : this.data.specific;
      console.log('Parsed specific data:', this.specificData);
    } catch (e) {
      console.error('Error parsing specific data:', e);
      this.specificData = {};
    }

    // Create label text entity
    this.labelEl = document.createElement('a-text');
    this.labelEl.setAttribute('value', this.data.label);
    this.labelEl.setAttribute('align', 'center');
    this.labelEl.setAttribute('position', '0 0.5 0');
    this.labelEl.setAttribute('scale', '0.5 0.5 0.5');
    this.labelEl.setAttribute('visible', false);
    this.labelEl.setAttribute('look-at', '#camera');
    this.el.appendChild(this.labelEl);

    // Set up circle geometry and hotspot texture
    this.el.setAttribute('geometry', 'primitive: circle; radius: 0.4');
    this.el.setAttribute('material', 'src: ../core/hotspot.png; transparent: true; opacity: 1');
    this.el.setAttribute('scale', '1 1 1');

    // Add class for raycaster detection
    this.el.classList.add('hotspot');

    // Check if hotspot should be disabled due to trigger conditions
    this.isLocked = false;
    if (this.specificData.triggerHotspot) {
      const triggerHotspot = document.querySelector(`[hotspot-id="${this.specificData.triggerSrc}"]`);
      if (triggerHotspot && !triggerHotspot.components.hotspot.data.visited) {
        console.log(`Hotspot ${this.data.id} is locked until trigger ${this.specificData.triggerSrc} is visited`);
        this.isLocked = true;
        // Make the hotspot semi-transparent and add a lock effect
        this.el.setAttribute('material', 'opacity', 0.5);
        this.el.setAttribute('material', 'color', '#666666');
      }
    }

    // Apply rotation if specified
    if (this.data.useRotation) {
      const rot = this.data.rotation.split(' ').map(Number);
      this.el.setAttribute('rotation', `${rot[0]} ${rot[1]} ${rot[2]}`);
    } else {
      // Make sure the hotspot faces the camera
      this.el.setAttribute('look-at', '#camera');
    }

    // Set up animations
    this.el.setAttribute('animation__scale', {
      property: 'scale',
      to: '1.2 1.2 1.2',
      dur: 200,
      startEvents: 'hotspotenter',
      easing: 'easeOutQuad'
    });

    this.el.setAttribute('animation__scaledown', {
      property: 'scale',
      to: '1 1 1',
      dur: 200,
      startEvents: 'hotspotsleave, click',
      easing: 'easeOutQuad'
    });

    // Create popup if needed
    if (this.data.type !== 'navigation') {
      console.log('Creating popup for hotspot:', this.data.id);
      console.log('Hotspot type:', this.data.type);
      
      if (this.popup) {
        console.warn('Popup already exists for hotspot:', this.data.id);
        return;
      }

      // Initialize popup data
      let popupData = {
        id: this.data.id,
        title: this.data.label,
        type: this.data.type,
        content: '',
        description: this.specificData.targetDesc || ''
      };

      // Handle different types of content
      if (this.data.type === 'quiz') {
        console.log('Setting up quiz popup with data:', this.specificData);
        
        // Ensure we have question details
        if (!this.specificData.questionDetails) {
          console.error('Quiz hotspot missing question details:', this.data.id);
          // Create default question details if missing
          this.specificData.questionDetails = {
            quizTitle: this.data.label,
            quizQuestion: "Default question",
            correctAnswerResponse: "Correct!",
            incorrectAnswerResponse: "Incorrect",
            generalAnswerFeedback: "Please try again",
            numberOfAnswers: 1,
            answers: [
              { text: "Default answer", isCorrect: true }
            ]
          };
        }
        
        // Pass only the question details
        popupData.content = JSON.stringify(this.specificData.questionDetails);
      } else {
        // For non-quiz types, use targetSrc
        popupData.content = this.specificData.targetSrc || '';
      }

      console.log('Final popup data:', popupData);
      
      // Create and initialize popup
      this.popup = document.createElement('a-entity');
      this.popup.setAttribute('popup', popupData);
      this.el.sceneEl.appendChild(this.popup);
      console.log('Popup created and added to scene for hotspot:', this.data.id);
    }

    // Log hotspot creation
    console.log(`Created hotspot ${this.data.id} of type ${this.data.type} at position ${this.el.getAttribute('position')}`);

    // Add event listeners for both mouse and VR cursor
    const showLabel = () => {
      if (!this.labelEl.getAttribute('visible')) {
        // If locked, show "Locked" message with original label
        if (this.isLocked) {
          const triggerHotspot = document.querySelector(`[hotspot-id="${this.specificData.triggerSrc}"]`);
          const triggerLabel = triggerHotspot ? triggerHotspot.components.hotspot.data.label : "another hotspot";
          this.labelEl.setAttribute('value', `${this.data.label}\n(Complete "${triggerLabel}" first)`);
        }
        this.labelEl.setAttribute('visible', true);
        if (!this.isLocked) {
          this.el.emit('hotspotenter');
        }
      }
    };

    const hideLabel = () => {
      if (this.labelEl.getAttribute('visible')) {
        this.labelEl.setAttribute('visible', false);
        if (!this.isLocked) {
          this.el.emit('hotspotsleave');
        }
      }
    };

    const handleClick = (event) => {
      console.log('Hotspot clicked:', this.data.id);
      console.log('Hotspot type:', this.data.type);
      console.log('Event type:', event.type);
      console.log('Event target:', event.target);
      
      if (this.isLocked) {
        // Maybe add a visual feedback that the hotspot is locked
        this.el.setAttribute('animation__shake', {
          property: 'position',
          dur: 100,
          dir: 'alternate',
          easing: 'easeInOutSine',
          loop: 2,
          from: `${this.el.getAttribute('position').x - 0.1} ${this.el.getAttribute('position').y} ${this.el.getAttribute('position').z}`,
          to: `${this.el.getAttribute('position').x + 0.1} ${this.el.getAttribute('position').y} ${this.el.getAttribute('position').z}`
        });
        return;
      }

      // For non-quiz hotspots, mark as visited immediately
      if (this.data.type !== 'quiz' && !this.data.visited) {
        this.markVisited();
      }

      // Handle click based on type
      if (this.data.type === 'navigation') {
        // Navigation is handled by the scene-manager
        console.log('Navigation hotspot clicked, target scene:', this.specificData.targetSrc);
        this.el.sceneEl.emit('navigateToScene', { sceneId: this.specificData.targetSrc });
        return;
      } else {
        // Show popup for other types
        console.log('Attempting to show popup for hotspot:', this.data.id);
        console.log('Popup exists:', !!this.popup);
        console.log('Popup component exists:', !!(this.popup && this.popup.components.popup));
        
        if (this.popup && this.popup.components.popup) {
          console.log('Popup component found, showing popup');
          console.log('Popup data before show:', {
            type: this.data.type,
            specific: this.specificData
          });
          this.popup.components.popup.show(this.el);
        } else {
          console.warn('Popup or popup component not found for hotspot:', this.data.id);
        }
      }
    };

    // Add method to mark hotspot as visited
    this.markVisited = () => {
      console.log('Marking hotspot as visited:', this.data.id);
      this.data.visited = true;
      this.el.setAttribute('material', 'color', '#666666');

      // After visiting, unlock any hotspots that depend on this one
      document.querySelectorAll('[hotspot-id]').forEach(hotspot => {
        const component = hotspot.components.hotspot;
        if (component && component.specificData.triggerHotspot && 
            component.specificData.triggerSrc === this.data.id) {
          console.log(`Unlocking hotspot ${component.data.id} after visiting ${this.data.id}`);
          component.isLocked = false;
          hotspot.setAttribute('material', 'opacity', 1);
          hotspot.setAttribute('material', 'color', '#FFFFFF');
        }
      });
    };

    // VR cursor events
    this.el.addEventListener('mouseenter', showLabel);
    this.el.addEventListener('mouseleave', hideLabel);
    this.el.addEventListener('click', handleClick);

    // Mouse cursor events
    this.el.addEventListener('raycaster-intersected', showLabel);
    this.el.addEventListener('raycaster-intersected-cleared', hideLabel);
    
    // Prevent duplicate events
    this.el.addEventListener('touchstart', (evt) => {
      evt.preventDefault();
      showLabel();
    });
    
    this.el.addEventListener('touchend', (evt) => {
      evt.preventDefault();
      hideLabel();
      handleClick(evt);
    });

    // Listen for quiz completion event
    this.el.sceneEl.addEventListener('quizCompleted', (event) => {
      if (event.detail.hotspotId === this.data.id && !this.data.visited) {
        this.markVisited();
      }
    });
  },

  remove: function() {
    // Clean up popup when hotspot is removed
    if (this.popup && this.popup.parentNode) {
      this.popup.parentNode.removeChild(this.popup);
    }
  }
}); 