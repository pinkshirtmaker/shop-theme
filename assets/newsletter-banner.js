import { HTMLCustomElement } from '~/theme';

if (!customElements.get('newsletter-banner')) {
  customElements.define(
    'newsletter-banner',
    class NewsletterBanner extends HTMLCustomElement {
      connectedCallback() {
        this.handlers = {
          form: {
            submit: this.handleFormSubmit.bind(this),
          },
        };

        this.setFormSubmitEvent();
      }

      /**
       * Sets the form submit event listener.
       * @param {Boolean} remove - Removes the event listener.
       */
      setFormSubmitEvent(remove = false) {
        if (remove) {
          this.targets.form.removeEventListener('submit', this.handlers.form.submit);
          return;
        }

        this.targets.form.addEventListener('submit', this.handlers.form.submit);
      }

      /**
       * Handles the form submit event.
       */
      async handleFormSubmit(event) {
        const form = new FormData(this.targets.form);

        event.preventDefault();

        this.dataset.state = 'loading';

        try {
          await fetch(
            `https://a.klaviyo.com/client/subscriptions/?company_id=${theme.settings.klaviyo_public_api_key}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                revision: '2024-10-15',
              },
              body: JSON.stringify({
                data: {
                  type: 'subscription',
                  attributes: {
                    profile: {
                      data: {
                        type: 'profile',
                        attributes: {
                          email: form.get('email'),
                          first_name: form.get('first_name'),
                          last_name: form.get('last_name'),
                        },
                      },
                    },
                  },
                  relationships: {
                    list: {
                      data: {
                        type: 'list',
                        id: 'UtDGsL',
                      },
                    },
                  },
                },
              }),
            }
          );

          this.dataset.state = 'success';
        } catch {
          this.dataset.state = 'error';
        }
      }

      disconnectedCallback() {
        this.setFormSubmitEvent(true);
      }
    }
  );
}
