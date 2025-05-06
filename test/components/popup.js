AFRAME.registerComponent('popup', {
  schema: {
    id: { type: 'string' },
    title: { type: 'string' },
    type: { type: 'string' },
    content: { type: 'string' },
    description: { type: 'string' }
  },

  init: function () {
    console.log('Initializing popup component');
    console.log('Initial data:', this.data);
    this.popupContainer = document.querySelector("#popup-container");



    // Create popup container
        // this.popup = document.createElement('div');
        // this.popup.classList.add('popup');
        // this.popup.style.position = 'fixed';
        // this.popup.style.top = '50%';
        // this.popup.style.left = '50%';
        // this.popup.style.transform = 'translate(-50%, -50%)';
        // this.popup.style.width = '400px';
        // this.popup.style.backgroundColor = 'white';
        // this.popup.style.padding = '20px';
        // this.popup.style.borderRadius = '8px';
        // this.popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        // this.popup.style.display = 'none';
        // this.popup.style.zIndex = '9999';
        // this.popup.style.opacity = '1';
        // this.popup.style.visibility = 'visible';

    // Title
        // const title = document.createElement('h2');
        // title.textContent = this.data.title;
        // this.popup.appendChild(title);
        // const hr = document.createElement('hr');
        // this.popup.appendChild(hr);

    // Close button (X)
        // const closeX = document.createElement('button');
        // closeX.textContent = 'X';
        // closeX.style.position = 'absolute';
        // closeX.style.top = '10px';
        // closeX.style.right = '10px';
        // closeX.style.border = 'none';
        // closeX.style.background = 'none';
        // closeX.style.fontSize = '24px';
        // closeX.style.cursor = 'pointer';
        // closeX.style.padding = '5px 10px';
        // closeX.addEventListener('click', () => {
        //   console.log('Close X button clicked');
        //   this.hide();
        // });
        // this.popup.appendChild(closeX);

    // Content container
        this.content = document.createElement('div');
        this.content.setAttribute('class', 'content');

        // this.content.style.marginBottom = '20px';
        // this.popup.appendChild(this.content);

    // Description text
        // if (this.data.description) {
        //   const desc = document.createElement('p');
        //   desc.textContent = this.data.description;
        //   desc.style.margin = '0 0 20px 0';
        //   desc.style.textAlign = 'center';
        //   this.popup.appendChild(desc);
        // }

    // Close button (bottom)
        // const closeBtn = document.createElement('button');
        // closeBtn.textContent = 'Close';
        // closeBtn.style.display = 'block';
        // closeBtn.style.margin = '0 auto';
        // closeBtn.style.padding = '8px 20px';
        // closeBtn.style.backgroundColor = '#333';
        // closeBtn.style.color = 'white';
        // closeBtn.style.border = 'none';
        // closeBtn.style.borderRadius = '4px';
        // closeBtn.style.cursor = 'pointer';
        // closeBtn.addEventListener('click', () => {
        //   console.log('Close button clicked');
        //   this.hide();
        // });
        // this.popup.appendChild(closeBtn);

    // Add to document body
        // document.body.appendChild(this.popup);
        // console.log('Popup element created and added to document body');

    let containerCode = this.content.outerHTML;

    let popupData=`
        <article>
          <header>
            <button class="popup-btn-close" aria-label="Close" rel="prev"></button>
            <h4>
              ${this.data.title}
            </h4>
          </header>
          <div class="content-container">
            <p>
              ${this.data.description}
            </p>
          </div>
          <footer>
            <button class="popup-btn-close secondary">Close</button>
          </footer>
        </article>`;
      console.log("popup-hotspot-"+this.data.id+">>\n"+popupData+"\n\n\n");
      // Create splash dialog
      this.popup = document.createElement('dialog');
      this.popup.setAttribute('id', 'popup-hotspot-'+this.data.id);
      this.popup.setAttribute('class', 'popup');

      this.popup.insertAdjacentHTML("afterbegin", popupData);
      this.popupContainer.appendChild(this.popup);  



    // Store the source hotspot that created this popup
    this.sourceHotspot = null;
    // Store the current iframe reference
    this.currentIframe = null;
    // Store quiz state
    this.quizStarted = false;
    this.questionDetails = null;

    // Add click outside handler
    this.clickOutsideHandler = (event) => {
      if (!this.popup.contains(event.target) &&
        (!this.sourceHotspot || !this.sourceHotspot.contains(event.target))) {
        this.hide();
      }
    };

    // Add scene change handler
    this.sceneChangeHandler = () => {
      console.log('Scene change detected');
      this.hide();
    };


    this.popupContainer.addEventListener('click', (event) => {
      if (event.target.classList.contains('popup-btn-close')) {
        this.hide();
      }
    });
  },

  update: function () {
    console.log('Update called on popup component');
    console.log('Current data:', this.data);
    console.log('Current id:', this.data.id);
    console.log('Current type:', this.data.type);
    console.log('Current content:', this.data.content);

    
    
    // Clear existing content
        // while (this.content.firstChild) {
        //   this.content.removeChild(this.content.firstChild);
        // }

    // Add new content based on type
    switch (this.data.type) {
      case 'quiz':
        console.log('Handling quiz type popup');

        try {
          // Parse the question details from content
          if (typeof this.data.content === 'string') {
            console.log('Parsing quiz content string');
            this.questionDetails = JSON.parse(this.data.content);
          } else {
            console.log('Using quiz content as is');
            this.questionDetails = this.data.content;
          }

          console.log('Parsed question details:', this.questionDetails);

          if (!this.questionDetails || !this.questionDetails.quizQuestion) {
            throw new Error('Invalid question details');
          }

          if (!this.quizStarted) {
            console.log('Showing quiz intro screen');
            this.showQuizIntro();
          } else {
            console.log('Showing quiz question screen');
            this.showQuizQuestion();
          }
        } catch (e) {
          console.error('Error handling quiz data:', e);
          console.log('Raw content that failed to parse:', this.data.content);
          // Show error message in popup
          const errorMessage = document.createElement('p');
          errorMessage.textContent = 'Sorry, there was an error loading the quiz. Please try again.';
          errorMessage.style.color = 'red';
          errorMessage.style.textAlign = 'center';
          this.content.appendChild(errorMessage);
        }
        break;

      case 'image':
        const imgFigure = document.createElement('figure');
        imgFigure.setAttribute('class', 'image');
        const image = document.createElement('img');
        image.src = this.data.content;
        imgFigure.appendChild(image);
        this.content.appendChild(imgFigure);
        break;

      case 'text':
        const text = document.createElement('p');
        text.textContent = this.data.content;
        this.content.appendChild(text);
        break;

      case 'video':
        var figure = document.createElement('figure');
        figure.setAttribute('class', 'video');
        var iframe = document.createElement('iframe');
        iframe.src = this.data.content;
        iframe.style.border = 'none';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture allowfullscreen';
        iframe.allowFullscreen = true;
        figure.appendChild(iframe);
        this.content.appendChild(figure);
        this.currentIframe = iframe;
        break;
    }
  
    // ref hotspot popup and add the generated content based on type
    const thisPopup = this.popupContainer.querySelector("#popup-hotspot-"+this.data.id+" .content-container");
    thisPopup.prepend(this.content);
  },

  showQuizIntro: function () {
    console.log('Creating quiz intro elements');

    // Create intro text
    const introText = document.createElement('p');
    introText.textContent = 'This quiz must be completed to progress through the experience.';
    introText.style.marginBottom = '20px';
    introText.style.textAlign = 'center';
    this.content.appendChild(introText);

    // Create answer type hints
    const singleAnswerHint = document.createElement('p');
    singleAnswerHint.textContent = '- This question only has a single answer.';
    singleAnswerHint.style.marginBottom = '10px';
    this.content.appendChild(singleAnswerHint);

    const multipleAnswerHint = document.createElement('p');
    multipleAnswerHint.textContent = '- This question may have multiple answers.';
    multipleAnswerHint.style.marginBottom = '20px';
    this.content.appendChild(multipleAnswerHint);

    // Create Begin button
    const beginBtn = document.createElement('button');
    beginBtn.textContent = 'Begin';
    beginBtn.style.display = 'block';
    beginBtn.style.margin = '0 auto 20px';
    beginBtn.style.padding = '8px 20px';
    beginBtn.style.backgroundColor = '#0066cc';
    beginBtn.style.color = 'white';
    beginBtn.style.border = 'none';
    beginBtn.style.borderRadius = '4px';
    beginBtn.style.cursor = 'pointer';
    beginBtn.addEventListener('click', (e) => {
      // Prevent any default behavior
      e.preventDefault();
      e.stopPropagation();

      console.log('Begin button clicked');
      this.quizStarted = true;

      // Clear existing content
      while (this.content.firstChild) {
        this.content.removeChild(this.content.firstChild);
      }

      // Show question content directly
      this.showQuizQuestion();
    });
    this.content.appendChild(beginBtn);

    console.log('Quiz intro elements created');
  },

  showQuizQuestion: function () {
    console.log('Showing quiz question with details:', this.questionDetails);

    if (!this.questionDetails || !this.questionDetails.quizQuestion || !this.questionDetails.answers) {
      console.error('Invalid question details:', this.questionDetails);
      const errorMessage = document.createElement('p');
      errorMessage.textContent = 'Sorry, there was an error loading the quiz question. Please try again.';
      errorMessage.style.color = 'red';
      errorMessage.style.textAlign = 'center';
      this.content.appendChild(errorMessage);
      return;
    }

    const details = this.questionDetails;

    // Question text
    const question = document.createElement('p');
    question.textContent = details.quizQuestion;
    question.style.marginBottom = '20px';
    question.style.textAlign = 'left';
    question.style.fontWeight = 'bold';
    this.content.appendChild(question);

    // Answer container
    const answersContainer = document.createElement('div');
    answersContainer.style.marginBottom = '20px';

    // Create radio inputs for answers
    details.answers.forEach((answer, index) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.marginBottom = '10px';
      label.style.cursor = 'pointer';
      label.style.position = 'relative';
      label.style.paddingLeft = '30px';

      const input = document.createElement('input');
      input.type = details.numberOfAnswers > 1 ? 'checkbox' : 'radio';
      input.name = 'quiz-answer';
      input.value = index;
      input.style.position = 'absolute';
      input.style.left = '0';
      input.style.top = '50%';
      input.style.transform = 'translateY(-50%)';

      const answerText = document.createElement('span');
      answerText.textContent = answer.text;

      // Feedback icon container
      const iconContainer = document.createElement('span');
      iconContainer.style.display = 'none';
      iconContainer.style.marginLeft = '10px';
      iconContainer.style.color = answer.isCorrect ? '#4CAF50' : '#f44336';
      iconContainer.textContent = answer.isCorrect ? '✓' : '✗';

      label.appendChild(input);
      label.appendChild(answerText);
      label.appendChild(iconContainer);
      answersContainer.appendChild(label);

      // Add click handler
      input.addEventListener('change', () => {
        console.log('Answer selected:', answer.text);

        // Show feedback
        const feedbackText = document.createElement('p');
        feedbackText.style.marginTop = '20px';
        feedbackText.style.textAlign = 'center';

        if (answer.isCorrect) {
          feedbackText.textContent = details.correctAnswerResponse;
          feedbackText.style.color = '#4CAF50';

          // Emit quiz completion event
          if (this.sourceHotspot) {
            console.log('Emitting quiz completion event for hotspot:', this.sourceHotspot.getAttribute('hotspot-id'));
            this.el.sceneEl.emit('quizCompleted', {
              hotspotId: this.sourceHotspot.getAttribute('hotspot-id')
            });
          }
        } else {
          feedbackText.textContent = details.incorrectAnswerResponse;
          feedbackText.style.color = '#f44336';
        }

        // Show all correct/incorrect indicators
        answersContainer.querySelectorAll('label').forEach(label => {
          label.querySelector('input').disabled = true;
          label.querySelector('span:last-child').style.display = 'inline';
        });

        // Add general feedback
        const generalFeedback = document.createElement('p');
        generalFeedback.textContent = details.generalAnswerFeedback;
        generalFeedback.style.marginTop = '10px';
        generalFeedback.style.textAlign = 'center';
        generalFeedback.style.fontStyle = 'italic';

        // Clear any existing feedback
        const existingFeedback = answersContainer.nextSibling;
        if (existingFeedback) {
          this.content.removeChild(existingFeedback);
        }

        this.content.appendChild(feedbackText);
        this.content.appendChild(generalFeedback);

        // If answer is correct, add a close button that will hide the popup
        if (answer.isCorrect) {
          const continueBtn = document.createElement('button');
          continueBtn.textContent = 'Continue';
          continueBtn.style.display = 'block';
          continueBtn.style.margin = '20px auto 0';
          continueBtn.style.padding = '8px 20px';
          continueBtn.style.backgroundColor = '#4CAF50';
          continueBtn.style.color = 'white';
          continueBtn.style.border = 'none';
          continueBtn.style.borderRadius = '4px';
          continueBtn.style.cursor = 'pointer';
          continueBtn.addEventListener('click', () => {
            this.hide();
          });
          this.content.appendChild(continueBtn);
        }
      });
    });

    this.content.appendChild(answersContainer);
  },

  show: function (sourceHotspot) {
    console.log('Show called with source hotspot:', sourceHotspot);
    console.log('Current popup type:', this.data.type);

    this.sourceHotspot = sourceHotspot;

    if (this.data.type === 'quiz') {
      console.log('Showing quiz popup');
      console.log('Current quiz state:', {
        started: this.quizStarted,
        hasQuestionDetails: !!this.questionDetails
      });
    }

    this.popup.setAttribute('open','');

    // Add event listeners when showing
    setTimeout(() => {
      document.addEventListener('click', this.clickOutsideHandler);
      this.el.sceneEl.addEventListener('sceneChanged', this.sceneChangeHandler);
    }, 100);
  },

  hide: function () {
    console.log('Hiding popup'+this.currentIframe);

    // Stop video if it's playing
    if (this.data.type=="video") {
      try {
        // For YouTube
        if (this.currentIframe.src.includes('youtube.com')) {
          this.currentIframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        }
        // For Vimeo
        else if (this.currentIframe.src.includes('vimeo.com')) {
          this.currentIframe.contentWindow.postMessage('{"method":"pause"}', '*');
        }
      } catch (e) {
        console.warn('Error stopping video:', e);
      }
    }

    this.popup.removeAttribute('open','');


    // Remove event listeners when hiding
    document.removeEventListener('click', this.clickOutsideHandler);
    this.el.sceneEl.removeEventListener('sceneChanged', this.sceneChangeHandler);

    // Clear the source hotspot reference
    this.sourceHotspot = null;

    // Reset quiz state when hiding
    this.quizStarted = false;
    this.questionDetails = null;
  },

  remove: function () {
    console.log('Removing popup');
    if (this.popup && this.popup.parentNode) {
      this.popup.parentNode.removeChild(this.popup);
    }
    // Clean up event listeners
    document.removeEventListener('click', this.clickOutsideHandler);
    this.el.sceneEl.removeEventListener('sceneChanged', this.sceneChangeHandler);
  }
}); 