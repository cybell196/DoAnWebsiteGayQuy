import React, { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../services/api';
import './RichTextEditor.css';

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const quillRef = useRef(null);

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
        ['link', 'image', 'video'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    clipboard: {
      matchVisual: false
    }
  };

  function imageHandler() {
    const quill = quillRef.current.getEditor();
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Kích thước file không được vượt quá 5MB');
          return;
        }

        // Validate file type
        if (!file.type.match('image.*')) {
          alert('Chỉ chấp nhận file ảnh');
          return;
        }

        // Create form data to upload
        const formData = new FormData();
        formData.append('image', file);

        try {
          // Upload image to server using api service
          const response = await api.post('/upload/image', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', response.data.imageUrl);
          quill.setSelection(range.index + 1);
        } catch (error) {
          console.error('Error uploading image:', error);
          // Fallback: Use data URL for preview (temporary)
          const reader = new FileReader();
          reader.onload = (e) => {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', e.target.result);
            quill.setSelection(range.index + 1);
          };
          reader.readAsDataURL(file);
        }
      }
    };
  }

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align'
  ];

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Viết nội dung chiến dịch của bạn...'}
      />
    </div>
  );
};

export default RichTextEditor;

