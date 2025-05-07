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
      console.log('Raw specific data type:', typeof this.data.specific);
      
      // Handle both string and object cases
      if (typeof this.data.specific === 'string') {
        try {
          this.specificData = JSON.parse(this.data.specific);
        } catch (parseError) {
          console.error('Error parsing specific data string:', parseError);
          this.specificData = {};
        }
      } else {
        this.specificData = this.data.specific;
      }
      
      console.log('Parsed specific data:', this.specificData);
      console.log('Specific data keys:', Object.keys(this.specificData));
      console.log('Has questionDetails:', !!this.specificData?.questionDetails);
      
      // Ensure questionDetails exists for quiz type
      if (this.data.type === 'quiz' && !this.specificData.questionDetails) {
        console.warn('Quiz hotspot missing question details, using default:', this.data.id);
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
    } catch (e) {
      console.error('Error handling specific data:', e);
      console.error('Raw specific data that failed:', this.data.specific);
      this.specificData = {};
    }

    // Create label text entity
    this.labelEl = document.createElement('a-text');
    this.labelEl.setAttribute('value', this.data.label);
    this.labelEl.setAttribute('align', 'center');
    this.labelEl.setAttribute('position', '0 0.8 0');
    this.labelEl.setAttribute('scale', '1.15 1.15 1.15');
    this.labelEl.setAttribute('visible', false);
    this.labelEl.setAttribute('look-at', '#camera');
    this.el.appendChild(this.labelEl);

    // Set up circle geometry and hotspot texture
    let iconSrc = './core/hotspot.png';
    if (this.data.type === 'navigation') {
      iconSrc = './core/navigation.png';
    } else if (this.data.type === 'quiz') {
      iconSrc = './core/quiz.png';
    }
    this.el.setAttribute('geometry', 'primitive: circle; radius: 0.4');
    this.el.setAttribute('material', `src: ${iconSrc}; transparent: true; opacity: 1`);
    this.el.setAttribute('scale', '0.6 0.6 0.6');

    // Add class for raycaster detection
    this.el.classList.add('hotspot');
    this.el.classList.add('ping');

    // Add pulse animation for active/unvisited/unlocked hotspots
    if (!this.data.visited && !this.isLocked) {
      this.el.setAttribute('animation__pulse', {
        property: 'scale',
        dir: 'alternate',
        dur: 1200,
        loop: true,
        to: '0.75 0.75 0.75',
        easing: 'easeInOutSine'
      });
    }

    // Check if hotspot should be disabled due to trigger conditions
    this.isLocked = false;
    if (this.specificData.triggerHotspot) {
      const triggerHotspot = document.querySelector(`[hotspot-id="${this.specificData.triggerSrc}"]`);
      if (triggerHotspot && !triggerHotspot.components.hotspot.data.visited) {
        console.log(`Hotspot ${this.data.id} is locked until trigger ${this.specificData.triggerSrc} is visited`);
        this.isLocked = true;
        this.el.classList.remove('ping');
        this.el.classList.add('heartbeat');
        // Remove pulse animation if locked
        this.el.removeAttribute('animation__pulse');
        // Make the hotspot semi-transparent and add a lock effect
        this.el.setAttribute('material', 'opacity', 0.95);
        this.el.setAttribute('material', 'color', '#999999');
        // Add locked badge if not already present
        if (!this.el.querySelector('.hotspot-locked-badge')) {
          const lockBadge = document.createElement('a-image');
          lockBadge.setAttribute('src', './core/locked.png');
          lockBadge.setAttribute('width', '0.25');
          lockBadge.setAttribute('height', '0.25');
          lockBadge.setAttribute('position', '0.25 0.25 0.01'); // top right
          lockBadge.setAttribute('class', 'hotspot-locked-badge');
          lockBadge.setAttribute('transparent', 'true');
          lockBadge.setAttribute('opacity', '1');
          this.el.appendChild(lockBadge);
          console.log('QUIZ>> Locked badge added to hotspot:', this.data.id);
        }
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
          this.labelEl.setAttribute('value', `LOCKED:\n${this.data.label}\n(Complete "${triggerLabel}")`);
        } else {
          // Reset to original label if not locked
          this.labelEl.setAttribute('value', this.data.label);
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

    // Listen for quiz completion event
    this.el.sceneEl.addEventListener('quizCompleted', (event) => {
      console.log('QUIZ>> Quiz completion event received');
      console.log('QUIZ>> Event details:', event.detail);
      console.log('QUIZ>> Current hotspot ID:', this.data.id);
      console.log('QUIZ>> Current visited state:', this.data.visited);
      
      // Convert both IDs to numbers for comparison
      const eventHotspotId = parseInt(event.detail.hotspotId, 10);
      const currentHotspotId = parseInt(this.data.id, 10);
      console.log('QUIZ>> Comparing hotspot IDs:', { eventHotspotId, currentHotspotId });
      console.log('QUIZ>> Is this the target hotspot?', eventHotspotId === currentHotspotId);
      
      if (eventHotspotId === currentHotspotId) {
        console.log('QUIZ>> This is the target hotspot');
        if (!this.data.visited) {
          console.log('QUIZ>> Hotspot not yet visited, marking as visited');
          this.markVisited();
        } else {
          console.log('QUIZ>> Hotspot already visited, skipping');
        }
      } else {
        console.log('QUIZ>> Not the target hotspot, ignoring event');
      }
    });

    // Add method to mark hotspot as visited
    this.markVisited = () => {
      console.log('QUIZ>> Marking hotspot as visited:', this.data.id);
      this.data.visited = true;
      this.el.setAttribute('material', 'color', '#666666');
      // Remove pulse animation if visited
      this.el.removeAttribute('animation__pulse');

      // Add completed badge if not already present
      if (!this.el.querySelector('.hotspot-completed-badge')) {
        const badge = document.createElement('a-image');
        badge.setAttribute('src', './core/completed.png');
        badge.setAttribute('width', '0.25');
        badge.setAttribute('height', '0.25');
        badge.setAttribute('position', '0.25 -0.25 0.01'); // bottom right, slightly in front
        badge.setAttribute('class', 'hotspot-completed-badge');
        badge.setAttribute('transparent', 'true');
        badge.setAttribute('opacity', '1');
        this.el.appendChild(badge);
        this.el.classList.remove('ping');
        this.el.classList.remove('heartbeat');
        console.log('QUIZ>> Completed badge added to hotspot:', this.data.id);
      }

      // After visiting, unlock any hotspots that depend on this one
      document.querySelectorAll('[hotspot-id]').forEach(hotspot => {
        const component = hotspot.components.hotspot;
        if (component && component.specificData.triggerHotspot && 
            component.specificData.triggerSrc === this.data.id) {
          console.log(`QUIZ>> Unlocking hotspot ${component.data.id} after visiting ${this.data.id}`);
          component.isLocked = false;
          hotspot.setAttribute('material', 'opacity', 1);
          hotspot.setAttribute('material', 'color', '#FFFFFF');
          // Also ensure the shader is set to 'standard' for full brightness
          hotspot.setAttribute('material', 'shader', 'standard');
          // Remove locked badge if present
          const lockBadge = hotspot.querySelector('.hotspot-locked-badge');
          if (lockBadge) {
            hotspot.removeChild(lockBadge);
            console.log('QUIZ>> Locked badge removed from hotspot:', component.data.id);
          }
          // Re-apply pulse animation if not visited
          if (!component.data.visited) {
            hotspot.setAttribute('animation__pulse', {
              property: 'scale',
              dir: 'alternate',
              dur: 1200,
              loop: true,
              to: '0.75 0.75 0.75',
              easing: 'easeInOutSine'
            });
          }
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
  },

  remove: function() {
    // Clean up popup when hotspot is removed
    if (this.popup && this.popup.parentNode) {
      this.popup.parentNode.removeChild(this.popup);
    }
  },

  showPopup: function () {
    console.log('Attempting to show popup for hotspot:', this.data.id);
    const popup = document.querySelector('#popup');
    console.log('Popup exists:', !!popup);
    const popupComponent = popup.components.popup;
    console.log('Popup component exists:', !!popupComponent);

    if (popup && popupComponent) {
      console.log('Popup component found, showing popup');
      console.log('Popup data before show:', {
        type: this.data.type,
        specific: this.specificData
      });

      // Set popup data based on type
      if (this.data.type === 'quiz') {
        popupComponent.setAttribute('popup', {
          type: 'quiz',
          specific: this.specificData
        });
      } else {
        popupComponent.setAttribute('popup', {
          type: this.data.type,
          content: this.data.content
        });
      }

      popupComponent.show(this.el);
    } else {
      console.error('Popup or popup component not found');
    }
  }
}); 
