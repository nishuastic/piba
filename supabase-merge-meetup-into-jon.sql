-- Merge "Meetup" payment method into "Jon" — they are the same entity
UPDATE attendees SET payment_method = 'Jon' WHERE payment_method = 'Meetup';
