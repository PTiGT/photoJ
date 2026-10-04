import { check, section } from './builder.js';

/*
 * Cross-browser registration checklist, structured like the classic
 * spreadsheet: Module › Submodule › Element/function › Summary.
 */
const element = (title, checks) => section(title, checks.map((label) => check(label)));

export const ALIEXPRESS_REGISTRATION = [
  section('Registration', [
    section('Choose a location', [
      element('Dropdown', [
        'All countries are loaded',
        'User can choose a country',
        'The country search is working',
        'Cancel button',
        'Input numbers > error message',
        'Input special characters > error message',
        'Empty state > error message',
      ]),
    ]),
    section('Registration via phone', [
      element('Phone', [
        'Existing phone > success',
        'The verification code was received',
        'Non-existing phone > error message',
        'Input letters > error message',
        'Input special characters > error message',
        'The button is disabled/active',
        'Empty value > error message',
      ]),
    ]),
    section('Registration via email', [
      element('Email', [
        'With existing email and password (6-20 symbols) > success',
        'Dropdown with emails',
        'The user was created and try to register again',
        'Cancel button',
        'Modify the email after receiving the verification code',
        'Close the verification window without code inputting',
        'Resend code',
        'Fill in wrong verification code > error message',
        'Empty value > error message',
        'Only letters > error message',
        'Only .com > error message',
        'Input special characters > error message',
        'Input numbers > error message',
      ]),
      element('Password', [
        'Cancel button',
        'Hide/unhide the password',
        'Empty value > error message',
        'Only letters > error message',
        'Input special characters > error message',
        'Input numbers > error message',
        'Input letters and special characters > error message',
        'Input letters and numbers > error message',
        'Input numbers and special characters > error message',
        'Input letters, numbers and special characters > success',
        'Input 5 symbols',
        'Input 7 symbols',
        'Input 19 symbols',
        'Input 21 symbols',
      ]),
    ]),
    section('Registration/log in via social media', [
      element('Registration via AppleID', [
        'With existing Apple ID > success',
        'With non-existing Apple ID > error message',
        'With decline of verification code > error message',
      ]),
      element('Registration via Google', ['With existing Google account > success', 'Without existing Google account > error message']),
      element('Registration via Facebook', ['With existing Facebook account', 'Without existing Facebook account > error message']),
      element('Registration via Twitter', ['With existing Twitter account > success', 'Without existing Twitter account > error message']),
      element('Registration via VK', ['With existing VK account > success', 'Without existing VK account > error message']),
      element('Registration via OK', ['With existing OK account > success', 'Without existing OK account > error message']),
      element('Show more', ['Show more/Hide feature']),
    ]),
    section('Policy', [element('Links for Policy', ['AliExpress.com Free Membership Agreement', 'Privacy Policy'])]),
    section('Triggers', [
      element('Close the registration window', ['The window is closed by button', 'The window is closed by empty space clicking']),
    ]),
  ]),
];
